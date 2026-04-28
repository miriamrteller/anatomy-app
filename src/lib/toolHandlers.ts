/**
 * Tool Handler Functions
 * 
 * These functions execute when GPT-4 calls a tool during the agent loop.
 * Each handler:
 * 1. Validates input arguments
 * 2. Queries the database
 * 3. Returns structured result for LLM context
 */

import { db } from './db';
import {
  HighlightStructuresArgsSchema,
  ShowLayerArgsSchema,
  GetRelatedStructuresArgsSchema,
} from './tools';

/**
 * Tool Result Format
 * Consistent structure for all tool results so LLM can parse reliably
 */
interface ToolResult {
  success: boolean;
  data?: any;
  message: string;
  error?: string;
}

/**
 * TOOL 1: highlight_structures
 * 
 * Finds structures that have any of the requested data-svg-id values in their svgPathIds array.
 * Uses Prisma's hasSome operator to match partial array containment.
 * 
 * @param args - { ids: string[] } where ids are data-svg-id values like ["femur-left", "skull"]
 * @returns ToolResult with matching structures
 */
export async function highlightStructuresHandler(args: unknown): Promise<ToolResult> {
  try {
    const parsed = HighlightStructuresArgsSchema.parse(args);
    
    console.log('[Tool:highlight] Args:', {
      count: parsed.ids.length,
      ids: parsed.ids,
    });
    
    // Query database for structures that have ANY of these data-svg-id values
    const structures = await db.structure.findMany({
      where: {
        svgPathIds: {
          hasSome: parsed.ids,
        },
      },
      select: {
        id: true,
        name: true,
        latinName: true,
        system: true,
        svgPathIds: true,
      },
    });
    
    // Find which requested IDs were found
    const foundIds = new Set<string>();
    structures.forEach((s: typeof structures[number]) => s.svgPathIds.forEach((id: string) => foundIds.add(id)));
    const missingIds = parsed.ids.filter(id => !foundIds.has(id));
    
    console.log('[Tool:highlight] Result:', {
      found: structures.length,
      foundIds: Array.from(foundIds),
      missing: missingIds,
      svgPathsTotal: structures.reduce((sum: number, s: typeof structures[number]) => sum + s.svgPathIds.length, 0),
    });
    
    if (structures.length === 0) {
      return {
        success: false,
        message: `No structures found with data-svg-ids: ${parsed.ids.join(', ')}`,
        error: 'No matching structures',
      };
    }
    
    return {
      success: true,
      data: structures,
      message: `Highlighting ${structures.length} structure(s): ${structures.map((s: typeof structures[number]) => s.name).join(', ')}`,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Tool] highlight_structures error:', message);
    return {
      success: false,
      message: 'Failed to highlight structures',
      error: message,
    };
  }
}

/**
 * TOOL 2: show_layer
 * 
 * Validates the system enum, then returns all structures in that system.
 * This helps the frontend layer control and gives the LLM context about what's visible.
 * 
 * @param args - { system: string }
 * @returns ToolResult with all structures in the system
 */
export async function showLayerHandler(args: unknown): Promise<ToolResult> {
  console.log('[Tool] show_layer called with:', args);
  
  try {
    // Validate arguments (includes enum validation)
    const parsed = ShowLayerArgsSchema.parse(args);
    
    // Query database for all structures in this system
    const structures = await db.structure.findMany({
      where: {
        system: parsed.system,
      },
      select: {
        id: true,
        name: true,
        latinName: true,
        category: true,
        svgPathIds: true,
      },
      orderBy: {
        name: 'asc',
      },
    });
    
    console.log(`[Tool] show_layer: Found ${structures.length} structures in ${parsed.system} system`);
    
    return {
      success: true,
      data: {
        system: parsed.system,
        count: structures.length,
        structures,
      },
      message: `Showing ${parsed.system} system with ${structures.length} structures: ${structures.slice(0, 5).map((s: typeof structures[number]) => s.name).join(', ')}${structures.length > 5 ? `, and ${structures.length - 5} more` : ''}`,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Tool] show_layer error:', message);
    return {
      success: false,
      message: 'Failed to show layer',
      error: message,
    };
  }
}

/**
 * TOOL 3: get_related_structures
 * 
 * Fetches a structure and ONLY structures that genuinely share anatomical components
 * or are in the same anatomical region (e.g., other head structures for skull).
 * 
 * For now, returns just the target structure since we don't have explicit relationship data.
 * Returns both the target and related structures for LLM context.
 * 
 * Relationship criteria:
 * - Same category (e.g., both are BONE structures)
 * - In close proximity (would be detected by name patterns or coordinates)
 * - Currently: just returns the target structure
 * 
 * @param args - { id: string }
 * @returns ToolResult with target structure and related structures
 */
export async function getRelatedStructuresHandler(args: unknown): Promise<ToolResult> {
  console.log('[Tool] get_related_structures called with:', args);
  
  try {
    // Validate arguments
    const parsed = GetRelatedStructuresArgsSchema.parse(args);
    
    // The id can be either:
    // 1. An SVG path ID like "femur-left" (preferred by LLM based on tool description)
    // 2. A structure name like "Femur (Left)"
    // 3. A database UUID (legacy)
    
    let targetStructure = null;
    
    // Try to find by SVG path ID first (most common case from LLM)
    targetStructure = await db.structure.findFirst({
      where: { svgPathIds: { has: parsed.id } },
      select: {
        id: true,
        name: true,
        latinName: true,
        system: true,
        category: true,
        description: true,
        svgPathIds: true,
      },
    });
    
    // If not found, try as structure name
    if (!targetStructure) {
      targetStructure = await db.structure.findFirst({
        where: { 
          name: {
            contains: parsed.id,
            mode: 'insensitive'
          }
        },
        select: {
          id: true,
          name: true,
          latinName: true,
          system: true,
          category: true,
          description: true,
          svgPathIds: true,
        },
      });
    }
    
    // If still not found, try as UUID (legacy)
    if (!targetStructure && parsed.id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      targetStructure = await db.structure.findUnique({
        where: { id: parsed.id },
        select: {
          id: true,
          name: true,
          latinName: true,
          system: true,
          category: true,
          description: true,
          svgPathIds: true,
        },
      });
    }
    
    if (!targetStructure) {
      return {
        success: false,
        message: `Structure not found: ${parsed.id}`,
        error: 'Could not find structure by SVG path ID, name, or UUID',
      };
    }
    
    // For now, just return the target structure itself
    // In a future iteration, we could add more sophisticated relationship detection
    // based on coordinates, anatomical groupings, etc.
    const relatedStructures: any[] = [];
    
    console.log(
      `[Tool] get_related_structures: Found target "${targetStructure.name}" with 0 related structures`
    );
    
    return {
      success: true,
      data: {
        target: targetStructure,
        related: relatedStructures,
        relationshipType: 'isolated',
      },
      message: `${targetStructure.name} (no anatomically related structures found in current data)`,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Tool] get_related_structures error:', message);
    return {
      success: false,
      message: 'Failed to get related structures',
      error: message,
    };
  }
}

/**
 * Tool Dispatch Router
 * 
 * Given a tool name and arguments, execute the appropriate handler.
 * Used by the agent loop to execute GPT-4's tool calls.
 * 
 * @param toolName - Name of the tool to execute
 * @param args - Tool arguments (JSON)
 * @returns ToolResult
 */
export async function executeTool(toolName: string, args: unknown): Promise<ToolResult> {
  switch (toolName) {
    case 'highlight_structures':
      return highlightStructuresHandler(args);
    case 'show_layer':
      return showLayerHandler(args);
    case 'get_related_structures':
      return getRelatedStructuresHandler(args);
    default:
      return {
        success: false,
        message: `Unknown tool: ${toolName}`,
        error: 'Tool not found',
      };
  }
}
