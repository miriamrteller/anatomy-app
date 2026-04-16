import { Request, Response } from 'express';
import { z } from 'zod';
import { db } from '../lib/db';
import { embedText, buildStructureText } from '../lib/embeddings';
import { getOpenAIClient } from '../lib/openai';
import { AppError } from '../lib/errors';

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
 * Structure result from semantic search
 * Includes similarity score for debugging
 */
interface SimilarStructure {
  id: string;
  name: string;
  latinName: string;
  system: string;
  category: string;
  description: string;
  svgPathIds: string[];
  similarity: number;
}

/**
 * Chat endpoint handler
 *
 * Flow:
 * 1. Validate question input
 * 2. Embed question using same model as training
 * 3. Find top 5 semantically similar structures using pgvector
 * 4. Build context string from structures
 * 5. Stream GPT-4o response via Server-Sent Events
 * 6. Send source IDs in separate event for frontend highlighting
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
  // STEP 2: Embed the Question
  // ============================================================
  // Convert user question to 1536-dimensional vector
  // Uses same model as structure embeddings for consistency
  let questionVector: number[];
  try {
    questionVector = await embedText(question);
    console.log(`📊 Question embedded (dimension: ${questionVector.length})`);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    throw new AppError(500, `Failed to embed question: ${message}`);
  }

  // ============================================================
  // STEP 3: Semantic Search with pgvector
  // ============================================================
  // Find top 5 structures with vectors closest to question vector
  // The <=> operator computes cosine distance (lower = more similar)
  let similarStructures: SimilarStructure[];
  try {
    const results = (await db.$queryRaw`
      SELECT
        id,
        name,
        "latin_name" as "latinName",
        system,
        category,
        description,
        "svgPathIds",
        1 - (embedding <=> ${questionVector}::vector) as similarity
      FROM structures
      WHERE embedding IS NOT NULL
      ORDER BY embedding <=> ${questionVector}::vector
      LIMIT 5
    `) as SimilarStructure[];

    similarStructures = results;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    throw new AppError(500, `Database search failed: ${message}`);
  }

  if (similarStructures.length === 0) {
    throw new AppError(
      404,
      'No structures found in database. ' +
        'Please run the embedding script first: npm run embed'
    );
  }

  console.log(`🔍 Found ${similarStructures.length} similar structures:`);
  similarStructures.forEach((s, i) => {
    const similarity = (s.similarity * 100).toFixed(1);
    console.log(`   ${i + 1}. ${s.name} (${similarity}% similar)`);
  });

  // ============================================================
  // STEP 4: Build Context for GPT-4o
  // ============================================================
  // Format top structures as readable context
  const contextText = similarStructures
    .map((s, i) => `${i + 1}. ${buildStructureText(s)}`)
    .join('\n\n');

  const systemPrompt = `You are an anatomy expert assistant.
Answer questions about anatomical structures using the provided context.
You may synthesize and summarize information from multiple structures to answer general questions.
Always reference structure names and details from the provided context.
Use anatomical expertise to connect related structures and explain relationships.
If truly insufficient information is provided, you may say "I don't have enough information to answer that."
Keep responses concise and educational.`;

  // ============================================================
  // STEP 5: Configure SSE Streaming
  // ============================================================
  // Server-Sent Events allows real-time token streaming
  // Browser receives tokens as they're generated instead of waiting for full response
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');

  let responseSent = false;

  try {
    // ============================================================
    // STEP 6: Send Source IDs Event
    // ============================================================
    // Frontend uses these IDs to highlight structures on the SVG
    // Use svgPathIds (from SVG) not id (UUID) so frontend can find the paths
    const sourceIds = similarStructures.flatMap((s) => s.svgPathIds || []);
    res.write(
      `data: ${JSON.stringify({
        event: 'sources',
        data: sourceIds,
      })}\n\n`
    );
    responseSent = true;

    // ============================================================
    // STEP 7: Call GPT-4o with Streaming
    // ============================================================
    const openai = getOpenAIClient();
    const stream = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        {
          role: 'user',
          content:
            `Context about relevant structures:\n\n${contextText}\n\n` +
            `---\n\nQuestion: ${question}`,
        },
      ],
      stream: true,
      temperature: 0.7,
      max_tokens: 500,
    });

    // ============================================================
    // STEP 8: Stream Tokens as They Arrive
    // ============================================================
    // Token arrives every ~100ms, sent immediately to client
    for await (const chunk of stream) {
      const token = chunk.choices[0]?.delta?.content || '';

      if (token) {
        res.write(
          `data: ${JSON.stringify({
            event: 'token',
            data: token,
          })}\n\n`
        );
      }
    }

    // ============================================================
    // STEP 9: Signal Stream Complete
    // ============================================================
    res.write(
      `data: ${JSON.stringify({
        event: 'done',
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
    res.write(
      `data: ${JSON.stringify({
        event: 'error',
        data: message,
      })}\n\n`
    );
    res.end();
  }
}
