/**
 * OpenAI Function Calling Tool Definitions
 * 
 * These tools define what GPT-4 can call during the agent loop.
 * Each tool follows OpenAI's function_calling format with:
 * - name: identifier for the tool
 * - description: what the tool does
 * - parameters: Zod schema converted to JSON Schema
 */

import { z } from 'zod';

/**
 * Tool 1: highlight_structures
 * 
 * Purpose: Highlight specific anatomical structures on the diagram by their IDs.
 * Called when the user wants to focus attention on particular structures.
 * 
 * Example: "highlight the femur and tibia"
 * → GPT-4 calls: highlight_structures({ ids: ["femur-id", "tibia-id"] })
 */
export const HighlightStructuresTool = {
  type: 'function',
  function: {
    name: 'highlight_structures',
    description: 'Highlight specific anatomical structures on the diagram by their svg_path_id. This makes them stand out visually with a pulsing animation so the user can see which structures you\'re referring to.',
    parameters: {
      type: 'object',
      properties: {
        ids: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of structure IDs to highlight (e.g., ["femur-left", "tibia-right"]). These IDs must match structures in the database.',
        },
      },
      required: ['ids'],
    },
  },
};

/**
 * Tool 2: show_layer
 * 
 * Purpose: Switch the visible layer to show a specific body system.
 * Only one system layer is visible at a time for clarity.
 * 
 * Example: "show me the skeletal system"
 * → GPT-4 calls: show_layer({ system: "SKELETAL" })
 */
export const ShowLayerTool = {
  type: 'function',
  function: {
    name: 'show_layer',
    description: 'Switch the visible layer to show a specific body system. This hides all other systems and displays only the requested one (e.g., skeleton, muscles, nerves, blood vessels). Valid systems are: SKELETAL, MUSCULAR, VASCULAR, NERVOUS, ENDOCRINE.',
    parameters: {
      type: 'object',
      properties: {
        system: {
          type: 'string',
          enum: ['SKELETAL', 'MUSCULAR', 'VASCULAR', 'NERVOUS', 'ENDOCRINE'],
          description: 'The body system to display. Hides all other systems.',
        },
      },
      required: ['system'],
    },
  },
};

/**
 * Tool 3: get_related_structures
 * 
 * Purpose: Fetch all structures that are directly related to a given structure.
 * Relationships are based on:
 * - Same system (e.g., all skeletal structures)
 * - Proximity/overlapping coordinates
 * 
 * This tool helps the agent understand context before deciding what to highlight.
 * 
 * Example: "show me everything connected to the femur"
 * → GPT-4 calls: get_related_structures({ id: "femur-left" })
 * → Returns related structures (tibia-left, fibula-left, hip-joint-left, etc.)
 * → GPT-4 then calls: highlight_structures({ ids: [...all related ids...] })
 */
export const GetRelatedStructuresTool = {
  type: 'function',
  function: {
    name: 'get_related_structures',
    description: 'Fetch all structures that are directly related to the given structure by matching system or overlapping coordinates. Returns the target structure and up to 10 related structures. Use this to understand anatomical relationships before highlighting.',
    parameters: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'The structure ID to find relationships for (e.g., "femur-left"). Must be a valid structure ID from the database.',
        },
      },
      required: ['id'],
    },
  },
};

/**
 * Validation schemas for tool arguments
 * Used on the backend to validate tool calls before execution
 */
export const HighlightStructuresArgsSchema = z.object({
  ids: z.array(z.string()).min(1, 'At least one structure ID is required'),
});

export const ShowLayerArgsSchema = z.object({
  system: z.enum(['SKELETAL', 'MUSCULAR', 'VASCULAR', 'NERVOUS', 'ENDOCRINE']),
});

export const GetRelatedStructuresArgsSchema = z.object({
  id: z.string().min(1, 'Structure ID is required'),
});

/**
 * Combined tool definitions array for OpenAI API
 * Pass this directly to the GPT-4o function calling parameter
 */
export const AGENT_TOOLS = [
  HighlightStructuresTool,
  ShowLayerTool,
  GetRelatedStructuresTool,
];

/**
 * Type-safe tool call union for TypeScript
 */
export type ToolCall = 
  | { name: 'highlight_structures'; args: z.infer<typeof HighlightStructuresArgsSchema> }
  | { name: 'show_layer'; args: z.infer<typeof ShowLayerArgsSchema> }
  | { name: 'get_related_structures'; args: z.infer<typeof GetRelatedStructuresArgsSchema> };
