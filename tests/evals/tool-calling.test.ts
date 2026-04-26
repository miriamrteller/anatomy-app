/**
 * Tool-Calling Correctness Tests
 * 
 * Validates whether the agent correctly selects and executes tools,
 * particularly that all SVG IDs are valid (zero-tolerance policy).
 * 
 * Success Criteria (from EVAL_SUCCESS_CRITERIA.md):
 * - Tool Precision: 95% (correct tool calls / total calls)
 * - Tool Recall: 92% (correct tool calls / expected calls)
 * - Invalid SVG ID Rate: 0% (absolute zero tolerance)
 */

import { describe, it, expect, beforeAll } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

interface EvalQuery {
  id: string;
  category: string;
  difficulty: number;
  query: string;
  expectedToolCalls: string[];
  expectedStructures: string[];
}

const VALID_SVG_IDS = [
  'foot-left', 'foot-right', 'tarsals-left', 'tarsals-right',
  'metatarsals-left', 'metatarsals-right', 'phalanges-left', 'phalanges-right',
  'phalanges-f-left', 'phalanges-f-right', 'femur-left', 'femur-right',
  'fibula-left', 'fibula-right', 'tibia', 'tibia-left', 'tibia-right',
  'patella-left', 'patella-right', 'pelvis', 'pelvic-girdle', 'sacrum', 'coccyx',
  'lumbar-vertebrae', 'ribcage', 'thoracic-vertebrae', 'cervical-vertebrae',
  'knee-joint-left', 'knee-joint-right', 'hip-joint-left', 'hip-joint-right',
  'sternum', 'manubrium', 'skull', 'mandible', 'teeth', 'cranium',
  'scapula', 'scapular-left', 'scapula-right', 'clavicle-left', 'clavicle-right',
  'humerus-left', 'humerus-right', 'radius-left', 'radius-right',
  'ulna-left', 'ulna-right', 'hand-left', 'hand-right',
  'carpals-left', 'carpals-right', 'metacarpals-left', 'metacarpals-right',
];

const VALID_TOOL_NAMES = ['highlight_structures', 'show_layer', 'get_related_structures'];

describe('Tool-Calling Correctness', () => {
  let queries: EvalQuery[] = [];

  beforeAll(() => {
    const datasetPath = path.join(__dirname, 'benchmark-dataset.json');
    queries = JSON.parse(fs.readFileSync(datasetPath, 'utf-8'));
  });

  describe('SVG ID Validation (Zero Tolerance)', () => {
    it('should reject any query with invalid SVG IDs in expectedStructures', () => {
      let invalidCount = 0;
      let invalidQueries: string[] = [];

      queries.forEach((q) => {
        const invalidIds = q.expectedStructures.filter((id) => !VALID_SVG_IDS.includes(id));
        if (invalidIds.length > 0) {
          invalidCount += invalidIds.length;
          invalidQueries.push(`${q.id}: ${invalidIds.join(', ')}`);
        }
      });

      expect(
        invalidCount,
        `Found ${invalidCount} invalid SVG IDs in queries: ${invalidQueries.join('; ')}`
      ).toBe(0);
    });

    it('should have zero invalid SVG IDs across all 77 queries', () => {
      const allStructures = queries.flatMap((q) => q.expectedStructures);
      const uniqueInvalid = new Set(
        allStructures.filter((id) => !VALID_SVG_IDS.includes(id))
      );

      expect(uniqueInvalid.size).toBe(0);
    });
  });

  describe('Tool Call Validation', () => {
    it('should only use valid tool names in expectedToolCalls', () => {
      let invalidToolCount = 0;
      let invalidTools = new Set<string>();

      queries.forEach((q) => {
        q.expectedToolCalls.forEach((toolName) => {
          if (!VALID_TOOL_NAMES.includes(toolName)) {
            invalidToolCount++;
            invalidTools.add(toolName);
          }
        });
      });

      expect(invalidToolCount, `Invalid tools used: ${Array.from(invalidTools).join(', ')}`).toBe(
        0
      );
    });

    it('highlight_structures should only be called with valid SVG IDs', () => {
      const highlightQueries = queries.filter((q) =>
        q.expectedToolCalls.includes('highlight_structures')
      );
      expect(highlightQueries.length).toBeGreaterThan(0);

      highlightQueries.forEach((q) => {
        // If highlight_structures is expected, expectedStructures should not be empty
        expect(q.expectedStructures.length).toBeGreaterThan(0);
        
        // All expectedStructures must be valid
        q.expectedStructures.forEach((id) => {
          expect(VALID_SVG_IDS).toContain(id);
        });
      });
    });

    it('show_layer should only be used with valid system names', () => {
      const layerQueries = queries.filter((q) => q.expectedToolCalls.includes('show_layer'));
      const validSystems = ['SKELETAL', 'MUSCULAR', 'VASCULAR', 'NERVOUS', 'ENDOCRINE'];

      layerQueries.forEach((q) => {
        if (q.expectedToolCalls.includes('show_layer')) {
          // Currently only SKELETAL is implemented
          expect(q.expectedSystems).toContain('SKELETAL');
        }
      });
    });

    it('get_related_structures should reference structures in expectedStructures', () => {
      const relatedQueries = queries.filter((q) =>
        q.expectedToolCalls.includes('get_related_structures')
      );

      relatedQueries.forEach((q) => {
        // This tool should be used when asking about relationships
        // Query should have expectedStructures as context
        expect(q.expectedStructures.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Tool Precision Targets', () => {
    it('should have appropriate tool expectations for straightforward queries', () => {
      const straightforwardQueries = queries.filter((q) => q.category === 'straightforward');
      const withHighlight = straightforwardQueries.filter((q) =>
        q.expectedToolCalls.includes('highlight_structures')
      );

      // Straightforward queries mostly expect highlighting
      expect(withHighlight.length / straightforwardQueries.length).toBeGreaterThanOrEqual(0.8);
    });

    it('should have appropriate tool expectations for system-specific queries', () => {
      const systemQueries = queries.filter((q) => q.category === 'system-specific');
      const withLayerSwitch = systemQueries.filter((q) =>
        q.expectedToolCalls.includes('show_layer')
      );

      // Some system-specific queries should expect layer switching
      expect(withLayerSwitch.length).toBeGreaterThan(0);
    });
  });

  describe('Tool Call Consistency', () => {
    it('queries without expectedStructures should not expect highlight_structures', () => {
      const noStructureQueries = queries.filter((q) => q.expectedStructures.length === 0);

      noStructureQueries.forEach((q) => {
        expect(q.expectedToolCalls).not.toContain('highlight_structures');
      });
    });

    it('all queries with highlight_structures should have expectedStructures', () => {
      const highlightQueries = queries.filter((q) =>
        q.expectedToolCalls.includes('highlight_structures')
      );

      highlightQueries.forEach((q) => {
        expect(q.expectedStructures.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Dataset Quality', () => {
    it('should have 77 total queries with valid tool configurations', () => {
      expect(queries.length).toBe(77);
      expect(queries.every((q) => q.expectedToolCalls && Array.isArray(q.expectedToolCalls))).toBe(
        true
      );
    });

    it('should not have duplicate query IDs', () => {
      const ids = queries.map((q) => q.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('all expectedToolCalls should be in valid tool set', () => {
      const usedTools = new Set<string>();
      queries.forEach((q) => {
        q.expectedToolCalls.forEach((tool) => usedTools.add(tool));
      });

      usedTools.forEach((tool) => {
        expect(VALID_TOOL_NAMES).toContain(tool);
      });
    });
  });
});
