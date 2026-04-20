import { Request, Response } from 'express';
import { z } from 'zod';
import { getOpenAIClient } from '../lib/openai';
import { AppError } from '../lib/errors';
import { AGENT_TOOLS } from '../lib/tools';
import { executeTool, getRelatedStructuresHandler } from '../lib/toolHandlers';
import { db } from '../lib/db';

/**
 * Type-safe request validation for chat endpoint
 */
const ChatRequestSchema = z.object({
  question: z
    .string()
    .min(1, 'Question cannot be empty')
    .max(500, 'Question must be less than 500 characters'),
});

/**
 * Chat endpoint handler with OpenAI function calling and agent loop
 *
 * Flow:
 * 1. Validate question input
 * 2. Initialize message history with system prompt and user question
 * 3. FOR each iteration (max 5):
 *    a. Call GPT-4o with tools enabled
 *    b. Stream text tokens as SSE 'token' events
 *    c. IF GPT-4o calls a tool:
 *       - Send SSE 'tool_call' event so frontend can act immediately
 *       - Execute the tool handler
 *       - Append tool result to message history
 *       - CONTINUE loop (go back to step 3a)
 *    d. ELSE (finish_reason === 'stop'):
 *       - BREAK loop (LLM is done)
 * 4. Send SSE 'done' event
 *
 * Safety: Hard stop at 5 iterations to prevent infinite loops
 *
 * @param req - Express request with question in body
 * @param res - Express response (configured for SSE streaming)
 */
export async function chat(req: Request, res: Response): Promise<void> {
  // ============================================================
  // STEP 1: Validate Input
  // ============================================================
  let question: string;
  try {
    const body = ChatRequestSchema.parse(req.body);
    question = body.question;
  } catch (error) {
    throw new AppError(400, `Invalid request: ${error}`);
  }

  console.log(`\n💬 Chat question: "${question}"`);

  // ============================================================
  // STEP 2: Configure SSE Streaming
  // ============================================================
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');

  let responseSent = false;

  try {
    // ============================================================
    // STEP 3a: Extract Initial Sources (Related Structures)
    // ============================================================
    // Extract a bone name from the question to look up related structures
    // This is a simple heuristic - looks for common bone names in the question
    const boneKeywords = [
      'femur', 'tibia', 'fibula', 'cranium', 'skull', 'pelvis', 'humerus',
      'radius', 'ulna', 'spine', 'vertebra', 'ribs', 'sternum', 'clavicle',
      'scapula', 'patella', 'talus', 'calcaneus', 'carpals', 'tarsals',
      'phalanges', 'metacarpals', 'metatarsals', 'mandible', 'atlas', 'axis'
    ];
    
    const lowerQuestion = question.toLowerCase();
    const foundBone = boneKeywords.find(keyword => lowerQuestion.includes(keyword));
    
    console.log(`[Chat] Question: "${question}"`);
    console.log(`[Chat] Extracted bone: ${foundBone || 'none'}`);

    let sourceIds: string[] = [];
    if (foundBone) {
      try {
        // Find structure by name
        const targetStructure = await db.structure.findFirst({
          where: {
            name: {
              contains: foundBone,
              mode: 'insensitive',
            },
          },
          select: { id: true, svgPathIds: true },
        });

        if (targetStructure) {
          // Just use the target structure's svgPathIds, not related ones
          sourceIds = targetStructure.svgPathIds || [];
          console.log(`[Chat] Found structure "${foundBone}" with ${sourceIds.length} svg path IDs`);
        } else {
          console.log(`[Chat] No structure found for bone: ${foundBone}`);
        }
      } catch (error) {
        console.error(`[Chat] Error extracting sources:`, error);
      }
    }

    if (sourceIds.length > 0) {
      res.write(
        `data: ${JSON.stringify({
          event: 'sources',
          data: sourceIds,
        })}\n\n`
      );
      console.log(`📌 Sources event: ${sourceIds.length} structure IDs`);
      responseSent = true;
    } else {
      console.log(`[Chat] No sources to send`);
    }

    // ============================================================
    // STEP 3b: Initialize Message History for Agent Loop
    // ============================================================
    // The message history persists across tool calls and iterations
    // So the LLM can see the context of its previous decisions
    
    const systemPrompt = `You are an anatomy expert assistant with access to tools for interacting with an anatomical diagram.

IMPORTANT: When highlighting structures, use ONLY these exact data-svg-id values (kebab-case with -left/-right suffixes):
- Feet & Ankles: foot-left, foot-right, tarsals-left, tarsals-right, metatarsals-left, metatarsals-right, phalanges-left, phalanges-right
- Legs: femur-left, femur-right, tibia, tibia-left, tibia-right, fibula-left, fibula-right
- Knee & Hip: knee-joint-left, knee-joint-right, hip-joint, hip-joint-right, patella-left, patella-right
- Pelvis & Spine: pelvis, sacrum, coccyx, lumbar-vertebrae, thoracic-vertebrae, cervical-vertebrae
- Chest: ribcage, sternum, manubrium
- Head: skull, cranium, mandible, teeth
- Shoulders: scapula, scapular-left, scapula-right, clavicle-left, clavicle-right
- Arms: humerus-left, humerus-right, radius-left, radius-right, ulna-left, ulna-right
- Hands: hand-left, hand-right, carpals-left, carpals-right, metacarpals-left, metacarpals-right, phalanges-left, phalanges-right

You have the following tools available:
- highlight_structures: Highlight specific anatomical structures on the diagram by their data-svg-id
- show_layer: Switch the visible layer to show a specific body system
- get_related_structures: Fetch related structures based on anatomical relationships

Use these tools to help the user explore and understand anatomical structures.
You can call multiple tools in sequence to provide a comprehensive answer.
For example: if a user asks "show me everything connected to the femur", you might:
1. Call show_layer to display the SKELETAL system
2. Call highlight_structures with ["femur-left", "tibia-left", "fibula-left", "patella-left", "knee-joint-left"]

Always explain what you're doing and why. Keep responses concise and educational.`;


    type MessageRole = 'system' | 'user' | 'assistant' | 'tool';
    interface Message {
      role: MessageRole;
      content?: string;
      tool_call_id?: string;
    }
    
    const messageHistory: Message[] = [
      {
        role: 'system',
        content: systemPrompt,
      },
      {
        role: 'user',
        content: question,
      },
    ];

    // ============================================================
    // STEP 4: Agent Loop (Max 5 iterations)
    // ============================================================
    const MAX_ITERATIONS = 5;
    let iteration = 0;
    let shouldContinue = true;

    while (shouldContinue && iteration < MAX_ITERATIONS) {
      iteration++;
      console.log(`\n🔄 Agent Loop Iteration ${iteration}/${MAX_ITERATIONS}`);

      // ========================================================
      // STEP 4a: Call GPT-4o with Tools
      // ========================================================
      const openai = getOpenAIClient();
      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: messageHistory as any,
        tools: AGENT_TOOLS as any,
        tool_choice: 'auto', // Let GPT-4 decide whether to call a tool
        stream: true,
        temperature: 0.7,
        max_tokens: 1000,
      });

      // ========================================================
      // STEP 4b: Process Streaming Response
      // ========================================================
      let assistantMessage = {
        role: 'assistant' as const,
        content: '',
      };
      let toolCalls: any[] = [];

      for await (const chunk of response) {
        // Handle text tokens
        if (chunk.choices[0]?.delta?.content) {
          const token = chunk.choices[0].delta.content;
          assistantMessage.content += token;

          // Send token to frontend immediately (streaming)
          res.write(
            `data: ${JSON.stringify({
              event: 'token',
              data: token,
            })}\n\n`
          );
          responseSent = true;
        }

        // Handle tool calls
        if (chunk.choices[0]?.delta?.tool_calls) {
          const deltaToolCalls = chunk.choices[0].delta.tool_calls;
          for (const deltaCall of deltaToolCalls) {
            if (deltaCall.index !== undefined) {
              if (!toolCalls[deltaCall.index]) {
                toolCalls[deltaCall.index] = {
                  id: '',
                  type: 'function',
                  function: { name: '', arguments: '' },
                };
              }
              if (deltaCall.id) {
                toolCalls[deltaCall.index].id = deltaCall.id;
              }
              if (deltaCall.function?.name) {
                toolCalls[deltaCall.index].function.name = deltaCall.function.name;
              }
              if (deltaCall.function?.arguments) {
                toolCalls[deltaCall.index].function.arguments +=
                  deltaCall.function.arguments;
              }
            }
          }
        }

        // Check finish reason
        if (chunk.choices[0]?.finish_reason === 'tool_calls') {
          // LLM wants to call tools
          // Continue loop to process tool calls
        } else if (chunk.choices[0]?.finish_reason === 'stop') {
          // LLM is done
          shouldContinue = false;
        }
      }

      // ========================================================
      // STEP 4c: Handle Tool Calls (if any)
      // ========================================================
      if (toolCalls.length > 0) {
        console.log(`📞 Tool calls received: ${toolCalls.length}`);

        // Add assistant message with tool_calls to history
        // OpenAI requires tool result messages to follow an assistant message with tool_calls
        messageHistory.push({
          role: 'assistant' as const,
          content: assistantMessage.content,
          tool_calls: toolCalls as any,
        });

        // Execute each tool call
        for (const toolCall of toolCalls) {
          const toolName = toolCall.function.name;
          let toolArgs;

          try {
            toolArgs = JSON.parse(toolCall.function.arguments);
          } catch {
            toolArgs = {};
          }

          console.log(`   → Calling ${toolName}(${JSON.stringify(toolArgs)})`);

          // Send tool_call event to frontend immediately
          res.write(
            `data: ${JSON.stringify({
              event: 'tool_call',
              data: {
                tool_name: toolName,
                arguments: toolArgs,
                iteration,
              },
            })}\n\n`
          );
          responseSent = true;

          // Execute the tool handler
          const toolResult = await executeTool(toolName, toolArgs);
          console.log(
            `   ✓ Result: ${toolResult.success ? 'Success' : 'Failed'} - ${toolResult.message}`
          );

          // Add tool result to message history
          messageHistory.push({
            role: 'tool',
            content: JSON.stringify(toolResult),
            tool_call_id: toolCall.id,
          });
        }

        // Continue loop if we haven't hit the iteration limit
        if (iteration >= MAX_ITERATIONS) {
          console.log('⚠️  Reached maximum iterations (5), stopping agent loop');
          shouldContinue = false;
        }
      } else {
        // No tool calls, add assistant message and finish
        messageHistory.push(assistantMessage);
        shouldContinue = false;
      }
    }

    // ============================================================
    // STEP 5: Signal Stream Complete
    // ============================================================
    res.write(
      `data: ${JSON.stringify({
        event: 'done',
        data: { iterations: iteration },
      })}\n\n`
    );
    res.end();
  } catch (error) {
    // Only write error if headers haven't been sent
    if (!responseSent) {
      res.status(500).json({
        error: 'Stream failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
      return;
    }

    // If streaming already started, send error as SSE event
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Chat stream error:', message);
    res.write(
      `data: ${JSON.stringify({
        event: 'error',
        data: message,
      })}\n\n`
    );
    res.end();
  }
}
