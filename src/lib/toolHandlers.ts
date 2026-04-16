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
 * Validates that the requested structure IDs exist in the database,
 * then returns their names and SVG path IDs for the frontend to highlight.
 * 
 * @param args - { ids: string[] }
 * @returns ToolResult with structure names and SVG paths
 */
export async function highlightStructuresHandler(args: unknown): Promise<ToolResult> {
  console.log('[Tool] highlight_structures called with:', args);
  
  try {
    // Validate arguments
    const parsed = HighlightStructuresArgsSchema.parse(args);
    
    // Query database for structures
    const structures = await db.structure.findMany({
      where: {
        id: {
          in: parsed.ids,
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
    
    if (structures.length === 0) {
      return {
        success: false,
        message: `No structures found with IDs: ${parsed.ids.join(', ')}`,
        error: 'Invalid structure IDs',
      };
    }
    
    const foundIds = structures.map(s => s.id);
    const missingIds = parsed.ids.filter(id => !foundIds.includes(id));
    
    console.log(
      `[Tool] highlight_structures: Found ${structures.length}/${parsed.ids.length} structures`,
      `(Missing: ${missingIds.length ? missingIds.join(', ') : 'none'})`
    );
    
    return {
      success: true,
      data: structures,
      message: `Highlighting ${structures.length} structure(s): ${structures.map(s => s.name).join(', ')}`,
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
      message: `Showing ${parsed.system} system with ${structures.length} structures: ${structures.slice(0, 5).map(s => s.name).join(', ')}${structures.length > 5 ? `, and ${structures.length - 5} more` : ''}`,
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
 * Fetches a structure and all related structures (same system + optionally by proximity).
 * Returns both the target and related structures for LLM context.
 * 
 * Relationship criteria:
 * - Same system (e.g., all skeletal structures are "related" to the femur)
 * - Up to 10 related structures sorted alphabetically
 * 
 * @param args - { id: string }
 * @returns ToolResult with target structure and related structures
 */
export async function getRelatedStructuresHandler(args: unknown): Promise<ToolResult> {
  console.log('[Tool] get_related_structures called with:', args);
  
  try {
    // Validate arguments
    const parsed = GetRelatedStructuresArgsSchema.parse(args);
    
    // Fetch the target structure
    const targetStructure = await db.structure.findUnique({
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
    
    if (!targetStructure) {
      return {
        success: false,
        message: `Structure not found: ${parsed.id}`,
        error: 'Invalid structure ID',
      };
    }
    
    // Fetch related structures in the same system
    // Related = same system, excluding the target itself
    const relatedStructures = await db.structure.findMany({
      where: {
        AND: [
          { system: targetStructure.system },
          { id: { not: parsed.id } }, // Exclude the target
        ],
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
      take: 10, // Limit to 10 related structures
    });
    
    console.log(
      `[Tool] get_related_structures: Found target "${targetStructure.name}" with ${relatedStructures.length} related structures`
    );
    
    return {
      success: true,
      data: {
        target: targetStructure,
        related: relatedStructures,
        relationshipType: 'same_system',
      },
      message: `${targetStructure.name} is related to ${relatedStructures.length} other ${targetStructure.system} structures: ${relatedStructures.slice(0, 3).map(s => s.name).join(', ')}${relatedStructures.length > 3 ? `, and ${relatedStructures.length - 3} more` : ''}`,
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
