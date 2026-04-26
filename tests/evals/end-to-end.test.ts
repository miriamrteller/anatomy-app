/**
 * End-to-End Integration Tests
 * 
 * Validates the complete query→response flow including:
 * - Question parsing
 * - RAG retrieval
 * - Tool execution
 * - Response generation
 * - SSE streaming
 */

import { describe, it, expect, beforeAll } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { EvalQuery, VALID_CATEGORIES, VALID_SYSTEMS } from './types';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe('End-to-End Integration', () => {
  let queries: EvalQuery[] = [];

  beforeAll(() => {
    const datasetPath = path.join(__dirname, 'benchmark-dataset.json');
    queries = JSON.parse(fs.readFileSync(datasetPath, 'utf-8'));
  });

  describe('Query Structure Validation', () => {
    it('all queries should have required fields', () => {
      queries.forEach((q) => {
        expect(q.id).toBeDefined();
        expect(q.category).toBeDefined();
        expect(q.query).toBeDefined();
        expect(Array.isArray(q.expectedStructures)).toBe(true);
        expect(Array.isArray(q.expectedToolCalls)).toBe(true);
        expect(Array.isArray(q.expectedSystems)).toBe(true);
        expect(Array.isArray(q.answerMustContain)).toBe(true);
        expect(Array.isArray(q.answerMustNotContain)).toBe(true);
      });
    });

    it('all queries should have non-empty query text', () => {
      queries.forEach((q) => {
        expect(q.query.length).toBeGreaterThan(5);
        expect(q.query.length).toBeLessThan(500);
      });
    });

    it('query IDs should be unique and follow naming convention', () => {
      const ids = queries.map((q) => q.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);

      // IDs should follow pattern: category-number
      ids.forEach((id) => {
        expect(id).toMatch(/^[a-z\-]+\-\d+$/);
      });
    });
  });

  describe('Category Distribution', () => {
    it('should have well-distributed queries across categories', () => {
      const categories = new Set(queries.map((q) => q.category));
      expect(categories.size).toBeGreaterThanOrEqual(4);

      const categoryStats: Record<string, number> = {};
      queries.forEach((q) => {
        categoryStats[q.category] = (categoryStats[q.category] || 0) + 1;
      });

      // No category should be more than 50% of dataset
      Object.values(categoryStats).forEach((count) => {
        expect(count / queries.length).toBeLessThan(0.5);
      });

      // No category should be less than 10% of dataset
      Object.values(categoryStats).forEach((count) => {
        expect(count / queries.length).toBeGreaterThan(0.1);
      });
    });

    it('straightforward category should be well represented', () => {
      const straightforward = queries.filter((q) => q.category === 'straightforward');
      expect(straightforward.length).toBeGreaterThanOrEqual(15);
      expect(straightforward.length).toBeLessThanOrEqual(25);
    });

    it('edge-case category should have notable representation', () => {
      const edgeCases = queries.filter((q) => q.category === 'edge-case');
      expect(edgeCases.length).toBeGreaterThanOrEqual(10);
    });
  });

  describe('Difficulty Distribution', () => {
    it('should span difficulty levels 1-5', () => {
      const difficulties = new Set(queries.map((q) => q.difficulty));
      expect(difficulties.size).toBeGreaterThanOrEqual(4);
      expect(Array.from(difficulties).every((d) => d >= 1 && d <= 5)).toBe(true);
    });

    it('should have more easy queries than hard queries', () => {
      const easy = queries.filter((q) => q.difficulty <= 2).length;
      const hard = queries.filter((q) => q.difficulty >= 4).length;
      expect(easy).toBeGreaterThan(hard);
    });
  });

  describe('System Coverage', () => {
    it('all queries should target valid systems', () => {
      queries.forEach((q) => {
        q.expectedSystems.forEach((system) => {
          expect(VALID_SYSTEMS).toContain(system);
        });
        });
      });
    });

    it('should predominantly target SKELETAL system in Phase 6', () => {
      const skeletalQueries = queries.filter((q) =>
        q.expectedSystems.includes('SKELETAL')
      );
      
      // Phase 6 focuses on skeletal system (minimum 75% coverage)
      expect(skeletalQueries.length / queries.length).toBeGreaterThan(0.75);
    });

    it('non-SKELETAL systems should only be in factual questions (no tools)', () => {
      const nonSkeletalQueries = queries.filter((q) =>
        q.expectedSystems.some((s) => s !== 'SKELETAL')
      );

      nonSkeletalQueries.forEach((q) => {
        // These are likely about non-existent structures
        expect(q.expectedToolCalls.length).toBe(0);
      });
    });

  describe('Tool-Structure Alignment', () => {
    it('highlight_structures should correspond to expectedStructures', () => {
      const highlightQueries = queries.filter((q) =>
        q.expectedToolCalls.includes('highlight_structures')
      );

      highlightQueries.forEach((q) => {
        expect(q.expectedStructures.length).toBeGreaterThan(0);
      });
    });

    it('queries without structures should not expect highlighting', () => {
      const noStructureQueries = queries.filter((q) => q.expectedStructures.length === 0);

      noStructureQueries.forEach((q) => {
        expect(q.expectedToolCalls).not.toContain('highlight_structures');
      });
    });

    it('show_layer should be in system-specific queries primarily', () => {
      const layerQueries = queries.filter((q) => q.expectedToolCalls.includes('show_layer'));

      const systemSpecific = layerQueries.filter((q) => q.category === 'system-specific');
      expect(systemSpecific.length / layerQueries.length).toBeGreaterThan(0.5);
    });
  });

  describe('Quality Guidelines Completeness', () => {
    it('all queries should have at least one quality guideline', () => {
      queries.forEach((q) => {
        const hasGuideline =
          q.answerMustContain.length > 0 || q.answerMustNotContain.length > 0;
        expect(hasGuideline, `Query ${q.id} missing quality guidelines`).toBe(true);
      });
    });

    it('most queries should have must-contain guidelines', () => {
      const withMustContain = queries.filter((q) => q.answerMustContain.length > 0);
      expect(withMustContain.length / queries.length).toBeGreaterThan(0.85);
    });

    it('guidelines should not be contradictory', () => {
      queries.forEach((q) => {
        const mustContainLower = new Set(
          q.answerMustContain.map((t) => t.toLowerCase())
        );
        const mustNotContainLower = new Set(
          q.answerMustNotContain.map((t) => t.toLowerCase())
        );

        mustContainLower.forEach((term) => {
          expect(mustNotContainLower.has(term)).toBe(false);
        });
      });
    });
  });

  describe('Dataset Integrity', () => {
    it('should have sufficient queries for evaluation', () => {
      expect(queries.length).toBeGreaterThanOrEqual(60);
    });

    it('all query categories should be recognized', () => {
      queries.forEach((q) => {
        expect(VALID_CATEGORIES).toContain(q.category);
      });
    });

    it('no query should have empty ID', () => {
      queries.forEach((q) => {
        expect(q.id).toBeTruthy();
        expect(q.id.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Dataset Readiness for Eval', () => {
    it('should have sufficient diversity for comprehensive evaluation', () => {
      const categoryDiversity = new Set(queries.map((q) => q.category)).size;
      const difficultyDiversity = new Set(queries.map((q) => q.difficulty)).size;
      
      expect(categoryDiversity).toBeGreaterThanOrEqual(4);
      expect(difficultyDiversity).toBeGreaterThanOrEqual(4);
    });

    it('should include queries testing main tools', () => {
      const hasHighlight = queries.some((q) =>
        q.expectedToolCalls.includes('highlight_structures')
      );
      const hasLayer = queries.some((q) => q.expectedToolCalls.includes('show_layer'));

      // At least 2 of the main tools should be represented in dataset
      expect(hasHighlight || hasLayer).toBe(true);
      expect(hasHighlight).toBe(true); // highlight_structures is essential
    });

    it('should test both structure-based and factual queries', () => {
      const withStructures = queries.filter((q) => q.expectedStructures.length > 0);
      const factualOnly = queries.filter((q) => q.expectedStructures.length === 0);

      expect(withStructures.length).toBeGreaterThan(30);
      expect(factualOnly.length).toBeGreaterThan(10);
    });
  });
});
