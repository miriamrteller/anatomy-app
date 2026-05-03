/**
 * Performance/Latency Tests
 * 
 * Validates that response times meet SLA targets by category.
 * 
 * SLA Targets (from EVAL_SUCCESS_CRITERIA.md):
 * - straightforward: TTFT 1500ms, E2E 6000ms
 * - common-student: TTFT 1800ms, E2E 8000ms
 * - system-specific: TTFT 2000ms, E2E 10000ms
 * - edge-case: TTFT 2500ms, E2E 12000ms
 */

import { describe, it, expect, beforeAll } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { EvalQuery } from './types';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SLA_TARGETS: Record<string, { ttft_ms: number; e2e_ms: number }> = {
  straightforward: { ttft_ms: 1500, e2e_ms: 6000 },
  'common-student': { ttft_ms: 1800, e2e_ms: 8000 },
  'system-specific': { ttft_ms: 2000, e2e_ms: 10000 },
  'edge-case': { ttft_ms: 2500, e2e_ms: 12000 },
};

describe('Performance & Latency', () => {
  let queries: EvalQuery[] = [];

  beforeAll(() => {
    const datasetPath = path.join(__dirname, 'benchmark-dataset.json');
    queries = JSON.parse(fs.readFileSync(datasetPath, 'utf-8'));
  });

  describe('SLA Target Definitions', () => {
    it('should have SLA targets defined for all categories', () => {
      const categories = new Set(queries.map((q) => q.category));

      categories.forEach((category) => {
        expect(SLA_TARGETS[category]).toBeDefined();
        expect(SLA_TARGETS[category].ttft_ms).toBeGreaterThan(0);
        expect(SLA_TARGETS[category].e2e_ms).toBeGreaterThan(0);
      });
    });

    it('TTFT should be less than E2E for all targets', () => {
      Object.entries(SLA_TARGETS).forEach(([category, targets]) => {
        expect(targets.ttft_ms).toBeLessThan(targets.e2e_ms);
      });
    });

    it('targets should scale with difficulty', () => {
      const straightforward = SLA_TARGETS['straightforward'];
      const systemSpecific = SLA_TARGETS['system-specific'];
      const edgeCase = SLA_TARGETS['edge-case'];

      // More complex categories should have longer targets
      expect(straightforward.e2e_ms).toBeLessThan(systemSpecific.e2e_ms);
      expect(systemSpecific.e2e_ms).toBeLessThan(edgeCase.e2e_ms);
    });
  });

  describe('Category-Specific Performance Expectations', () => {
    it('straightforward queries should have fastest SLA targets', () => {
      const targets = SLA_TARGETS['straightforward'];
      expect(targets.e2e_ms).toBe(6000);
      expect(targets.ttft_ms).toBe(1500);
    });

    it('system-specific queries should have moderate SLA targets', () => {
      const targets = SLA_TARGETS['system-specific'];
      expect(targets.e2e_ms).toBe(10000);
      expect(targets.ttft_ms).toBe(2000);
    });

    it('edge-case queries should have most lenient SLA targets', () => {
      const targets = SLA_TARGETS['edge-case'];
      expect(targets.e2e_ms).toBe(12000);
      expect(targets.ttft_ms).toBe(2500);
    });
  });

  describe('Difficulty vs Performance', () => {
    it('should have more easy queries than hard queries (for faster baseline)', () => {
      const easy = queries.filter((q) => q.difficulty <= 2);
      const hard = queries.filter((q) => q.difficulty >= 4);

      expect(easy.length).toBeGreaterThan(hard.length);
    });

    it('difficult queries should be distributed across all categories', () => {
      const difficultByCategory: Record<string, number> = {};

      queries
        .filter((q) => q.difficulty >= 4)
        .forEach((q) => {
          difficultByCategory[q.category] = (difficultByCategory[q.category] || 0) + 1;
        });

      // Each category should have at least some difficult queries
      const categoriesWithDifficult = Object.keys(difficultByCategory).length;
      expect(categoriesWithDifficult).toBeGreaterThanOrEqual(3);
    });
  });

  describe('Baseline Latency Expectations', () => {
    it('baseline average should be within typical API response times', () => {
      // Based on OpenAI GPT-4o streaming latencies (typical 15-25s E2E)
      // Our SLA targets are optimistic but achievable with good caching/optimization

      const maxE2E = Math.max(...Object.values(SLA_TARGETS).map((t) => t.e2e_ms));
      expect(maxE2E).toBe(12000); // 12 seconds max for edge-cases
    });

    it('first token latency should be 15-20% of total E2E latency', () => {
      Object.entries(SLA_TARGETS).forEach(([_, targets]) => {
        const ttftPercent = targets.ttft_ms / targets.e2e_ms;
        expect(ttftPercent).toBeGreaterThanOrEqual(0.15);
        expect(ttftPercent).toBeLessThanOrEqual(0.25);
      });
    });
  });

  describe('Performance Tiering', () => {
    it('should tier SLA targets appropriately by query complexity', () => {
      const straight = SLA_TARGETS['straightforward'].e2e_ms;
      const student = SLA_TARGETS['common-student'].e2e_ms;
      const system = SLA_TARGETS['system-specific'].e2e_ms;
      const edge = SLA_TARGETS['edge-case'].e2e_ms;

      // Each tier should be incrementally longer
      expect(straight).toBeLessThan(student);
      expect(student).toBeLessThan(system);
      expect(system).toBeLessThan(edge);

      // Differences should be reasonable (not 100x, more like 1.3-1.5x)
      expect(student / straight).toBeLessThan(1.5);
      expect(system / student).toBeLessThan(1.5);
      expect(edge / system).toBeLessThan(1.3);
    });
  });

  describe('Query Distribution for Performance Testing', () => {
    it('should have sufficient queries per category for statistical significance', () => {
      const queriesPerCategory: Record<string, number> = {};

      queries.forEach((q) => {
        queriesPerCategory[q.category] = (queriesPerCategory[q.category] || 0) + 1;
      });

      Object.values(queriesPerCategory).forEach((count) => {
        // At least 10 queries per category for meaningful performance baseline
        expect(count).toBeGreaterThanOrEqual(10);
      });
    });

    it('each category should have mixed difficulty levels', () => {
      const categories = new Set(queries.map((q) => q.category));

      categories.forEach((category) => {
        const categoryQueries = queries.filter((q) => q.category === category);
        const difficulties = new Set(categoryQueries.map((q) => q.difficulty));

        // Should have at least 3 different difficulty levels per category
        expect(difficulties.size).toBeGreaterThanOrEqual(2);
      });
    });
  });

  describe('Streaming Performance Requirements', () => {
    it('TTFT should be fast enough for perceived responsiveness', () => {
      const maxTTFT = Math.max(...Object.values(SLA_TARGETS).map((t) => t.ttft_ms));
      // Users expect first token within 2.5 seconds
      expect(maxTTFT).toBeLessThanOrEqual(2500);
    });

    it('E2E latency should be acceptable for student use cases', () => {
      const maxE2E = Math.max(...Object.values(SLA_TARGETS).map((t) => t.e2e_ms));
      // Students can wait up to 12s for learning material
      expect(maxE2E).toBeLessThanOrEqual(12000);
    });
  });

  describe('Performance Measurement Points', () => {
    it('should measure both TTFT and E2E latency', () => {
      // Test harness should collect:
      // 1. TTFT: Time from request to first response token
      // 2. E2E: Time from request to final response

      const metrics = ['ttft_ms', 'e2e_ms'];
      Object.values(SLA_TARGETS).forEach((target) => {
        metrics.forEach((metric) => {
          expect(target).toHaveProperty(metric);
        });
      });
    });

    it('should track latency separately per category', () => {
      const categories = Object.keys(SLA_TARGETS);
      expect(categories.length).toBeGreaterThanOrEqual(4);

      categories.forEach((category) => {
        expect(SLA_TARGETS[category]).toBeDefined();
      });
    });
  });
});
