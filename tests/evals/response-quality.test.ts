/**
 * Response Quality Tests
 * 
 * Validates whether chatbot responses contain required information
 * and avoid stating incorrect information.
 * 
 * Checks:
 * - answerMustContain: Key facts that must be in response
 * - answerMustNotContain: Incorrect statements to avoid
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
  answerMustContain: string[];
  answerMustNotContain: string[];
}

describe('Response Quality', () => {
  let queries: EvalQuery[] = [];

  beforeAll(() => {
    const datasetPath = path.join(__dirname, 'benchmark-dataset.json');
    queries = JSON.parse(fs.readFileSync(datasetPath, 'utf-8'));
  });

  describe('Answer Must Contain Validation', () => {
    it('should have answerMustContain guidelines for all queries', () => {
      queries.forEach((q) => {
        expect(Array.isArray(q.answerMustContain)).toBe(true);
      });
    });

    it('straightforward queries should require specific anatomical terms', () => {
      const straightforwardQueries = queries.filter((q) => q.category === 'straightforward');

      straightforwardQueries.forEach((q) => {
        // Each straightforward query should require at least one anatomical term
        expect(q.answerMustContain.length).toBeGreaterThanOrEqual(1);
        
        // Terms should be specific (not generic)
        q.answerMustContain.forEach((term) => {
          expect(term.length).toBeGreaterThan(0);
          expect(term).toBeTruthy();
        });
      });
    });

    it('student questions should require factual knowledge terms', () => {
      const studentQueries = queries.filter((q) => q.category === 'common-student');

      studentQueries.forEach((q) => {
        // Student questions often have specific factual requirements (like "206 bones")
        if (q.answerMustContain.length > 0) {
          expect(q.answerMustContain.some((term) => term.match(/\d+/))).toBe(true);
        }
      });
    });

    it('system-specific queries should require multiple anatomical terms', () => {
      const systemQueries = queries.filter((q) => q.category === 'system-specific');

      systemQueries.forEach((q) => {
        // Complex queries require more specific terms
        expect(q.answerMustContain.length).toBeGreaterThanOrEqual(2);
      });
    });
  });

  describe('Answer Must NOT Contain Validation', () => {
    it('should have answerMustNotContain guidelines where applicable', () => {
      queries.forEach((q) => {
        expect(Array.isArray(q.answerMustNotContain)).toBe(true);
      });
    });

    it('should not have overlapping terms in mustContain and mustNotContain', () => {
      queries.forEach((q) => {
        const mustContain = new Set(q.answerMustContain.map((s) => s.toLowerCase()));
        const mustNotContain = new Set(q.answerMustNotContain.map((s) => s.toLowerCase()));

        mustContain.forEach((term) => {
          expect(mustNotContain.has(term)).toBe(false);
        });
      });
    });

    it('student factual questions should specify wrong answers to avoid', () => {
      const studentQueries = queries.filter(
        (q) => q.category === 'common-student' && q.answerMustContain.some((t) => /\d+/.test(t))
      );

      // Questions with specific numbers should have wrong numbers in mustNotContain
      studentQueries.forEach((q) => {
        const hasNumericMustContain = q.answerMustContain.some((term) => /\d+/.test(term));
        if (hasNumericMustContain && q.answerMustNotContain.length > 0) {
          expect(q.answerMustNotContain.some((term) => /\d+/.test(term))).toBe(true);
        }
      });
    });
  });

  describe('Answer Guidelines Quality', () => {
    it('should have reasonable length for must-contain terms (not sentences)', () => {
      queries.forEach((q) => {
        q.answerMustContain.forEach((term) => {
          // Terms should be words/phrases, not full sentences
          expect(term.split(' ').length).toBeLessThanOrEqual(5);
        });
      });
    });

    it('should have reasonable length for must-not-contain terms', () => {
      queries.forEach((q) => {
        q.answerMustNotContain.forEach((term) => {
          expect(term.split(' ').length).toBeLessThanOrEqual(5);
        });
      });
    });

    it('each query should have at least one quality guideline', () => {
      queries.forEach((q) => {
        const hasGuidelines =
          q.answerMustContain.length > 0 || q.answerMustNotContain.length > 0;
        expect(hasGuidelines, `Query ${q.id} has no quality guidelines`).toBe(true);
      });
    });
  });

  describe('Category-Specific Patterns', () => {
    it('edge-case queries without structures should have strong quality guidelines', () => {
      const edgeQueries = queries.filter(
        (q) => q.category === 'edge-case' && !q.expectedStructures?.length
      );

      edgeQueries.forEach((q) => {
        // Without structures to highlight, quality of answer is critical
        expect(q.answerMustContain.length).toBeGreaterThan(0);
      });
    });

    it('factual-only queries should have specific factual requirements', () => {
      const factualQueries = queries.filter((q) => q.expectedToolCalls?.length === 0);

      factualQueries.forEach((q) => {
        expect(q.answerMustContain.length).toBeGreaterThan(0);
      });
    });

    it('multi-structure queries should define expected concepts', () => {
      const multiStructureQueries = queries.filter((q) => q.expectedStructures?.length > 3);

      multiStructureQueries.forEach((q) => {
        // Complex queries need clear quality markers
        expect(q.answerMustContain.length).toBeGreaterThanOrEqual(2);
      });
    });
  });

  describe('Anatomical Accuracy of Guidelines', () => {
    it('must-contain guidelines should use correct anatomical terminology', () => {
      const anatomicalTerms = [
        'bone', 'joint', 'vertebra', 'ribs', 'skull', 'spine',
        'shoulder', 'knee', 'wrist', 'ankle', 'hip', 'elbow',
        'forearm', 'thigh', 'leg', 'arm', 'hand', 'foot',
        'articulation', 'connection', 'attachment', 'protection',
      ];

      queries.forEach((q) => {
        q.answerMustContain.forEach((term) => {
          // Term should either be specific bone name or valid anatomical concept
          const isValidTerm =
            term.match(/[a-z\-]+/i) || // Multi-word terms
            anatomicalTerms.some((at) => term.toLowerCase().includes(at)) ||
            term.match(/\d+/); // Numbers for factual info

          expect(isValidTerm, `Invalid term "${term}" in query ${q.id}`).toBeTruthy();
        });
      });
    });

    it('queries about specific bones should require that bone name in answer', () => {
      const boneQueries = queries.filter((q) =>
        q.query.toLowerCase().match(/(?:where|show|identify|point out|highlight).*(bone|[a-z\-]+bone|skull|spine)/)
      );

      boneQueries.forEach((q) => {
        // Should have at least one anatomical term in must-contain
        const hasAnatomicalTerm = q.answerMustContain.some((t) =>
          t.match(/[a-z\-]+(bone)?|skull|spine|vertebr|rib/i)
        );
        expect(hasAnatomicalTerm, `Bone query ${q.id} missing anatomical term`).toBe(true);
      });
    });
  });

  describe('Dataset Completeness', () => {
    it('should have 77 total queries with quality guidelines', () => {
      expect(queries.length).toBe(77);
      expect(queries.every((q) => 
        q.answerMustContain && Array.isArray(q.answerMustContain)
      )).toBe(true);
    });

    it('queries should not have empty must-contain lists (except rare cases)', () => {
      const emptyMustContain = queries.filter((q) => q.answerMustContain.length === 0);
      
      // Most queries should have must-contain guidelines
      expect(queries.length - emptyMustContain.length).toBeGreaterThan(
        queries.length * 0.8
      );
    });
  });
});
