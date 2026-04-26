/**
 * Shared type definitions for evaluation tests
 */

import { EXISTING_BONES_SVG } from '../../src/lib/bone-constants';

// Extract type from the array of valid SVG IDs
export type ValidSvgId = typeof EXISTING_BONES_SVG[number];

// Create a set for runtime validation
export const VALID_SVG_IDS = new Set<ValidSvgId>(EXISTING_BONES_SVG);

// System types
export type ValidSystem = 'SKELETAL' | 'MUSCULAR' | 'VASCULAR' | 'NERVOUS' | 'ENDOCRINE';
export const VALID_SYSTEMS: ValidSystem[] = ['SKELETAL', 'MUSCULAR', 'VASCULAR', 'NERVOUS', 'ENDOCRINE'];

// Category types
export type QueryCategory = 'straightforward' | 'common-student' | 'system-specific' | 'edge-case';
export const VALID_CATEGORIES: QueryCategory[] = [
  'straightforward',
  'common-student',
  'system-specific',
  'edge-case',
];

// Tool types
export type ToolName = 'highlight_structures' | 'show_layer' | 'get_related_structures';
export const VALID_TOOLS: ToolName[] = ['highlight_structures', 'show_layer', 'get_related_structures'];

// Main eval query interface with strong typing
export interface EvalQuery {
  id: string;
  category: QueryCategory;
  difficulty: number;
  query: string;
  expectedStructures: ValidSvgId[];
  expectedToolCalls: ToolName[];
  expectedSystems: ValidSystem[];
  answerMustContain: string[];
  answerMustNotContain: string[];
}

// Validation helpers
export function isValidSvgId(id: string): id is ValidSvgId {
  return VALID_SVG_IDS.has(id as ValidSvgId);
}

export function isValidCategory(category: string): category is QueryCategory {
  return VALID_CATEGORIES.includes(category as QueryCategory);
}

export function isValidSystem(system: string): system is ValidSystem {
  return VALID_SYSTEMS.includes(system as ValidSystem);
}

export function isValidTool(tool: string): tool is ToolName {
  return VALID_TOOLS.includes(tool as ToolName);
}

/**
 * Validate entire EvalQuery object
 * Returns array of error messages (empty if valid)
 */
export function validateEvalQuery(q: any): string[] {
  const errors: string[] = [];

  if (!q.id || typeof q.id !== 'string') errors.push(`${q.id}: missing or invalid id`);
  if (!isValidCategory(q.category)) errors.push(`${q.id}: invalid category "${q.category}"`);
  if (typeof q.difficulty !== 'number' || q.difficulty < 1 || q.difficulty > 5) {
    errors.push(`${q.id}: difficulty must be 1-5`);
  }
  if (!q.query || typeof q.query !== 'string' || q.query.length < 5) {
    errors.push(`${q.id}: query must be string with 5+ chars`);
  }

  // Validate SVG IDs
  if (!Array.isArray(q.expectedStructures)) {
    errors.push(`${q.id}: expectedStructures must be array`);
  } else {
    q.expectedStructures.forEach((id: any) => {
      if (!isValidSvgId(id)) {
        errors.push(`${q.id}: invalid SVG ID "${id}"`);
      }
    });
  }

  // Validate tools
  if (!Array.isArray(q.expectedToolCalls)) {
    errors.push(`${q.id}: expectedToolCalls must be array`);
  } else {
    q.expectedToolCalls.forEach((tool: any) => {
      if (!isValidTool(tool)) {
        errors.push(`${q.id}: invalid tool "${tool}"`);
      }
    });
  }

  // Validate systems
  if (!Array.isArray(q.expectedSystems)) {
    errors.push(`${q.id}: expectedSystems must be array`);
  } else {
    q.expectedSystems.forEach((sys: any) => {
      if (!isValidSystem(sys)) {
        errors.push(`${q.id}: invalid system "${sys}"`);
      }
    });
  }

  // Validate answer guidelines
  if (!Array.isArray(q.answerMustContain)) errors.push(`${q.id}: answerMustContain must be array`);
  if (!Array.isArray(q.answerMustNotContain)) errors.push(`${q.id}: answerMustNotContain must be array`);

  return errors;
}
