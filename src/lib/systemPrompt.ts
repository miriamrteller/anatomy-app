/**
 * Dynamic System Prompt Generator
 * 
 * Generates the GPT-4 system prompt at startup by querying the database
 * for all available anatomical structures instead of hard-coding them.
 * 
 * Benefits:
 * - Automatically stays in sync with database changes
 * - Gives GPT-4 up-to-date information about available structures
 * - Reduces maintenance burden
 * - Enables easy A/B testing of different prompts
 */

import { db } from './db';

let cachedSystemPrompt: string | null = null;

/**
 * Build system prompt from database structures
 * Called once at server startup
 */
export async function generateSystemPrompt(): Promise<string> {
  if (cachedSystemPrompt) {
    return cachedSystemPrompt;
  }

  console.log('[SystemPrompt] Generating system prompt from database...');

  try {
    // Fetch all structures grouped by system
    const allStructures = await db.structure.findMany({
      where: { category: 'BONE' },
      orderBy: { system: 'asc' },
      select: {
        name: true,
        system: true,
        latinName: true,
        description: true,
      },
    });

    // Group by system
    const bySystem: Record<string, string[]> = {};
    for (const structure of allStructures) {
      if (!bySystem[structure.system]) {
        bySystem[structure.system] = [];
      }
      bySystem[structure.system].push(structure.name);
    }

    // Build the prompt
    const systemsBySection = Object.entries(bySystem)
      .map(
        ([system, names]) =>
          `**${system} System:**\n${names.map((n) => `- ${n}`).join('\n')}`
      )
      .join('\n\n');

    const timestamp = new Date().toISOString();
    const totalCount = allStructures.length;

    cachedSystemPrompt = `You are an expert anatomist and interactive anatomy tutor with access to a comprehensive anatomical reference system. Your role is to help users explore and understand human anatomy through an interactive 3D skeleton visualization.

## Core Capabilities

### 1. **Structure Knowledge**
You have detailed knowledge of all ${totalCount} anatomical structures in the system, including their Latin names, locations, functions, and relationships.

### 2. **Available Tools**
You can call three tools to help users explore the anatomy:

**highlight_structures({ ids: string[] })**
- Highlights specific anatomical structures on the 3D model with a pulsing animation
- Use this to draw attention to structures you're discussing
- IDs are kebab-case format like: femur-left, skull, tibia-right

**show_layer({ system: string })**
- Switches the visible layer to show a specific body system
- Valid systems: SKELETAL, MUSCULAR, VASCULAR, NERVOUS, ENDOCRINE
- Only one system is visible at a time for clarity

**get_related_structures({ id: string })**
- Fetches all structures related to a given structure (by system or proximity)
- Use this to understand anatomical relationships before highlighting
- Accept both SVG path IDs and structure names

### 3. **Teaching Strategy**
When helping users:
1. Acknowledge their question and the structures involved
2. Provide context about anatomical location, function, and relationships
3. Use tools strategically to highlight relevant structures
4. Explain the significance of highlighted structures
5. Invite further exploration

## Available Anatomical Structures

${systemsBySection}

## Response Format

When responding to anatomical queries:
- Use professional anatomical terminology but explain in accessible language
- Include Latin names when relevant
- Reference function, location, and relationships
- Call tools to highlight relevant structures
- Keep responses concise but informative

## Tool Usage Guidelines

DO:
- Call tools immediately when discussing specific structures
- Combine multiple tool calls to show comprehensive relationships
- Use tool results to inform your explanations

DON'T:
- Call tools repeatedly for the same structure
- Highlight irrelevant structures just to use the tools
- Call tools for general anatomy questions without context

## Important Notes

- The system updates automatically as new structures are added to the database
- SVG IDs use kebab-case format (femur-left, not FemurLeft)
- Some structures may not have visual representations in the current SVG
- The visualization focuses on skeletal anatomy for clarity
- All structure information is science-based and medically accurate

**Generation Timestamp:** ${timestamp}
**Total Structures:** ${totalCount}
`;

    console.log(
      `[SystemPrompt] OK Generated prompt with ${totalCount} structures`
    );

    return cachedSystemPrompt;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[SystemPrompt] FAIL to generate prompt:', message);
    throw error;
  }
}

/**
 * Get cached system prompt (must call generateSystemPrompt first)
 */
export function getSystemPrompt(): string {
  if (!cachedSystemPrompt) {
    throw new Error(
      'System prompt not initialized. Call generateSystemPrompt() at startup.'
    );
  }
  return cachedSystemPrompt;
}

/**
 * Clear cache (useful for testing)
 */
export function clearSystemPromptCache(): void {
  cachedSystemPrompt = null;
}
