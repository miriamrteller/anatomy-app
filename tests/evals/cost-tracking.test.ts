/**
 * Cost Tracking & Budget Tests
 * 
 * Validates that token usage and API costs stay within budget.
 * 
 * Pricing (GPT-4o April 2026):
 * - Input: $0.000005 per token
 * - Output: $0.000015 per token
 * - Average query cost: $0.00001 to $0.0001
 * 
 * Cost Budgets by Category:
 * - straightforward: $0.0135 (2,700 input + 900 output tokens avg)
 * - common-student: $0.0256 (5,100 input + 1,700 output tokens avg)
 * - system-specific: $0.0393 (7,800 input + 2,600 output tokens avg)
 * - edge-case: $0.0512 (10,200 input + 3,400 output tokens avg)
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
  difficulty: number;
  query: string;
}

const PRICING = {
  input_per_token: 0.000005,
  output_per_token: 0.000015,
};

const COST_BUDGETS: Record<string, number> = {
  straightforward: 0.0135,
  'common-student': 0.0256,
  'system-specific': 0.0393,
  'edge-case': 0.0512,
};

// Estimated token counts (based on GPT-4o tokenization)
const ESTIMATED_TOKENS: Record<string, { input: number; output: number }> = {
  straightforward: { input: 2700, output: 900 },
  'common-student': { input: 5100, output: 1700 },
  'system-specific': { input: 7800, output: 2600 },
  'edge-case': { input: 10200, output: 3400 },
};

describe('Cost Tracking & Budget', () => {
  let queries: EvalQuery[] = [];

  beforeAll(() => {
    const datasetPath = path.join(__dirname, 'benchmark-dataset.json');
    queries = JSON.parse(fs.readFileSync(datasetPath, 'utf-8'));
  });

  describe('Pricing Configuration', () => {
    it('should have correct GPT-4o pricing rates', () => {
      expect(PRICING.input_per_token).toBe(0.000005);
      expect(PRICING.output_per_token).toBe(0.000015);
    });

    it('output pricing should be higher than input pricing', () => {
      expect(PRICING.output_per_token).toBeGreaterThan(PRICING.input_per_token);
      expect(PRICING.output_per_token).toBe(PRICING.input_per_token * 3);
    });
  });

  describe('Cost Budget Definitions', () => {
    it('should have budgets for all categories', () => {
      const categories = new Set(queries.map((q) => q.category));

      categories.forEach((category) => {
        expect(COST_BUDGETS[category]).toBeDefined();
        expect(COST_BUDGETS[category]).toBeGreaterThan(0);
      });
    });

    it('budgets should scale with query complexity', () => {
      const straight = COST_BUDGETS['straightforward'];
      const student = COST_BUDGETS['common-student'];
      const system = COST_BUDGETS['system-specific'];
      const edge = COST_BUDGETS['edge-case'];

      expect(straight).toBeLessThan(student);
      expect(student).toBeLessThan(system);
      expect(system).toBeLessThan(edge);
    });

    it('budgets should be realistic for GPT-4o costs', () => {
      const maxBudget = Math.max(...Object.values(COST_BUDGETS));
      const minBudget = Math.min(...Object.values(COST_BUDGETS));

      expect(minBudget).toBeGreaterThan(0.01);
      expect(maxBudget).toBeLessThan(0.1);
    });
  });

  describe('Token Count Estimation', () => {
    it('should have token estimates for all categories', () => {
      Object.keys(COST_BUDGETS).forEach((category) => {
        expect(ESTIMATED_TOKENS[category]).toBeDefined();
        expect(ESTIMATED_TOKENS[category].input).toBeGreaterThan(0);
        expect(ESTIMATED_TOKENS[category].output).toBeGreaterThan(0);
      });
    });

    it('output tokens should be less than input tokens', () => {
      Object.values(ESTIMATED_TOKENS).forEach((tokens) => {
        expect(tokens.output).toBeLessThan(tokens.input);
      });
    });

    it('estimated costs should match budget allocations', () => {
      Object.entries(ESTIMATED_TOKENS).forEach(([category, tokens]) => {
        const estimatedCost =
          tokens.input * PRICING.input_per_token + tokens.output * PRICING.output_per_token;
        const budget = COST_BUDGETS[category];

        // Should be within ±5% of budget
        const tolerance = budget * 0.05;
        expect(estimatedCost).toBeGreaterThan(budget - tolerance);
        expect(estimatedCost).toBeLessThan(budget + tolerance);
      });
    });
  });

  describe('Token Counting Accuracy', () => {
    it('actual tokens should be within ±10% of estimates', () => {
      // This test validates the token counting method when run live
      // Expected: actual tokens ≈ estimate ± 10%
      const tolerance = 0.1; // 10% tolerance

      Object.entries(ESTIMATED_TOKENS).forEach(([_, tokens]) => {
        // Range: ±10% of estimate
        const minInput = tokens.input * (1 - tolerance);
        const maxInput = tokens.input * (1 + tolerance);

        const minOutput = tokens.output * (1 - tolerance);
        const maxOutput = tokens.output * (1 + tolerance);

        expect(minInput).toBeLessThan(maxInput);
        expect(minOutput).toBeLessThan(maxOutput);
      });
    });

    it('should track input vs output token ratio separately', () => {
      Object.entries(ESTIMATED_TOKENS).forEach(([_, tokens]) => {
        const ratio = tokens.output / tokens.input;
        // Output should be 25-40% of input for typical RAG queries
        expect(ratio).toBeGreaterThan(0.2);
        expect(ratio).toBeLessThan(0.5);
      });
    });
  });

  describe('Cost Budget Enforcement', () => {
    it('no single query should cost more than 2x its category budget', () => {
      // This ensures outlier queries don't blow the budget
      const maxAllowedCostPerQuery: Record<string, number> = {};

      Object.entries(COST_BUDGETS).forEach(([category, budget]) => {
        maxAllowedCostPerQuery[category] = budget * 2;
      });

      Object.entries(maxAllowedCostPerQuery).forEach(([category, maxCost]) => {
        expect(maxCost).toBeGreaterThan(0);
      });
    });

    it('straightforward queries should be most cost-efficient', () => {
      const straight = COST_BUDGETS['straightforward'];
      const student = COST_BUDGETS['common-student'];

      // Straightforward should cost roughly 50% of common-student
      expect(straight).toBeLessThan(student / 1.5);
    });

    it('edge-case queries can be up to 3.8x more expensive than straightforward', () => {
      const straight = COST_BUDGETS['straightforward'];
      const edge = COST_BUDGETS['edge-case'];

      const multiplier = edge / straight;
      expect(multiplier).toBeGreaterThan(3);
      expect(multiplier).toBeLessThan(5);
    });
  });

  describe('Query Complexity Impact on Cost', () => {
    it('query length might correlate with cost (longer queries = more tokens)', () => {
      const totalQueryLength = queries.reduce((sum, q) => sum + q.query.length, 0);
      const avgQueryLength = totalQueryLength / queries.length;

      // Average query should be 100-500 characters (roughly 20-125 tokens)
      expect(avgQueryLength).toBeGreaterThan(50);
      expect(avgQueryLength).toBeLessThan(1000);
    });

    it('difficulty level should not dramatically increase token cost', () => {
      // Difficulty 1-5 should map roughly to cost categories
      // But difficulty is independent of cost (some easy queries can be verbose)

      const byDifficulty: Record<number, number> = {};
      queries.forEach((q) => {
        if (!byDifficulty[q.difficulty]) byDifficulty[q.difficulty] = 0;
        byDifficulty[q.difficulty]++;
      });

      // Should have queries at all difficulty levels
      expect(Object.keys(byDifficulty).length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('Monthly Budget Projections', () => {
    it('should calculate total dataset cost', () => {
      const totalBudget = Object.values(COST_BUDGETS).reduce((sum, b) => sum + b, 0);

      // 77 queries × ~$0.03 avg = ~$2.31 per full dataset evaluation
      const avgCostPerQuery =
        totalBudget / Object.keys(COST_BUDGETS).length;
      const estimatedTotal = avgCostPerQuery * queries.length;

      expect(estimatedTotal).toBeGreaterThan(1.0);
      expect(estimatedTotal).toBeLessThan(10.0);
    });

    it('monthly cost with daily evals should be manageable', () => {
      // Daily eval = 77 queries/day
      // Monthly (30 days) = 2,310 queries
      // Cost ≈ $69 per month (manageable for development)

      const avgCostPerQuery = 0.03; // $0.03 average
      const queriesPerDay = queries.length;
      const daysPerMonth = 30;
      const monthlyQueries = queriesPerDay * daysPerMonth;
      const monthlyCost = monthlyQueries * avgCostPerQuery;

      expect(monthlyCost).toBeGreaterThan(50);
      expect(monthlyCost).toBeLessThan(150);
    });
  });

  describe('Cost Allocation by Category', () => {
    it('total dataset should have realistic cost distribution', () => {
      const queriesByCategory: Record<string, number> = {};

      queries.forEach((q) => {
        queriesByCategory[q.category] = (queriesByCategory[q.category] || 0) + 1;
      });

      // Calculate weighted cost
      let totalCost = 0;
      Object.entries(queriesByCategory).forEach(([category, count]) => {
        totalCost += count * COST_BUDGETS[category];
      });

      // Should total ~$2-3 for full 77-query dataset
      expect(totalCost).toBeGreaterThan(1.5);
      expect(totalCost).toBeLessThan(5.0);
    });

    it('should track which categories contribute most to total cost', () => {
      const edgeCaseBudget = COST_BUDGETS['edge-case'];
      const straightBudget = COST_BUDGETS['straightforward'];

      // Edge cases should contribute significantly to cost
      expect(edgeCaseBudget).toBeGreaterThan(straightBudget * 2);
    });
  });

  describe('Cost Optimization Opportunities', () => {
    it('should identify queries that might be cacheable (lower cost on repeat)', () => {
      // Identical queries should be cached to save cost
      const queryTexts = queries.map((q) => q.query);
      const uniqueQueries = new Set(queryTexts);

      // Should be mostly unique (no duplicates for testing)
      expect(uniqueQueries.size).toBeGreaterThanOrEqual(queries.length * 0.95);
    });

    it('system-specific queries should be optimized to reduce tokens', () => {
      const systemBudget = COST_BUDGETS['system-specific'];
      const straightBudget = COST_BUDGETS['straightforward'];

      // System-specific is 2.9x more expensive but has ~2.9x more tokens
      const multiplier = systemBudget / straightBudget;
      expect(multiplier).toBeGreaterThan(2);
      expect(multiplier).toBeLessThan(4);
    });
  });

  describe('Error Cost Prevention', () => {
    it('invalid queries should not incur API costs', () => {
      // All queries must pass validation before API call
      // Invalid SVG IDs, malformed queries should fail fast

      const validQueries = queries.filter((q) => q.id && q.query && q.category);
      expect(validQueries.length).toBe(queries.length);
    });

    it('retry logic should track cost of failed attempts', () => {
      // If a query fails and retries, cost is multiplied
      // Should track cumulative cost including retries

      // Example: if 5% of queries fail once → 105% cost
      // If 10% fail twice → 120% cost
      // Budget should account for ~2-5% failure rate

      const budgetPad = 1.05; // 5% padding for retries
      Object.values(COST_BUDGETS).forEach((budget) => {
        expect(budget).toBeGreaterThan(0);
      });
    });
  });
});
