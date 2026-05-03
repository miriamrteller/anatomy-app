/**
 * Source Validation Utility
 * 
 * Validates that LLM responses only contain information from:
 * 1. Database structures
 * 2. FMA (Foundational Model of Anatomy) data
 * 
 * Used by evals to detect hallucinations or external knowledge usage.
 */

import { db } from './db';

interface SourceCheckResult {
  isValid: boolean;
  violations: {
    type: 'unsourced_claim' | 'external_knowledge' | 'unsupported_structure';
    claim: string;
    severity: 'high' | 'medium' | 'low';
    explanation: string;
  }[];
  scorePercent: number; // 0-100
}

class SourceValidator {
  private structureNames: Set<string> = new Set();
  private latinNames: Set<string> = new Set();
  private fmaDefinitions: Map<string, string> = new Map();

  async initialize(): Promise<void> {
    console.log('[SourceValidator] Initializing database cache...');

    // Fetch all structures
    const structures = await db.structure.findMany({
      select: {
        name: true,
        latinName: true,
        description: true,
      },
    });

    structures.forEach((s) => {
      this.structureNames.add(s.name.toLowerCase());
      if (s.latinName) {
        this.latinNames.add(s.latinName.toLowerCase());
      }
      if (s.description) {
        this.fmaDefinitions.set(s.name.toLowerCase(), s.description);
      }
    });

    console.log(
      `[SourceValidator] Loaded ${this.structureNames.size} structures`
    );
  }

  /**
   * Check if response only contains sourced information
   *
   * Returns violations and a confidence score
   */
  async validate(
    response: string,
    fmaEnrichment: string
  ): Promise<SourceCheckResult> {
    const violations: SourceCheckResult['violations'] = [];

    // Red flags for external knowledge usage
    const redFlags = [
      {
        pattern: /\b(historically|was named|originated from|named after)\b/gi,
        type: 'external_knowledge' as const,
        explanation: 'Response includes historical context not in sources',
      },
      {
        pattern: /\b(studies? (show|suggest|indicate)|research has|evidence suggests)\b/gi,
        type: 'external_knowledge' as const,
        explanation:
          'Response cites unspecified studies not provided in FMA data',
      },
      {
        pattern:
          /\b(it is (commonly|typically|generally) believed|most people|conventional wisdom)\b/gi,
        type: 'external_knowledge' as const,
        explanation: 'Response uses common knowledge instead of official sources',
      },
      {
        pattern: /\b(in addition to|furthermore|moreover|additionally)\s+[^.]*\b(function|role|purpose)\b/gi,
        type: 'unsourced_claim' as const,
        explanation: 'Additional functions mentioned beyond FMA data',
      },
    ];

    // Check for red flags
    for (const flag of redFlags) {
      const matches = response.match(flag.pattern);
      if (matches) {
        matches.forEach((match) => {
          violations.push({
            type: flag.type,
            claim: match,
            severity: 'high',
            explanation: flag.explanation,
          });
        });
      }
    }

    // Check for structures not in database or FMA
    const structureMentions = this.extractStructureMentions(response);
    for (const mention of structureMentions) {
      const isKnown =
        this.structureNames.has(mention.toLowerCase()) ||
        this.latinNames.has(mention.toLowerCase()) ||
        fmaEnrichment.toLowerCase().includes(mention.toLowerCase());

      if (!isKnown && !this.isCommonAnatomicalTerm(mention)) {
        violations.push({
          type: 'unsupported_structure',
          claim: mention,
          severity: 'medium',
          explanation: `Structure "${mention}" not in database or FMA data`,
        });
      }
    }

    // Check for common hallucination patterns
    const hallucinations = this.detectHallucinations(response);
    violations.push(...hallucinations);

    // Calculate score
    const baseScore = 100;
    let scoreDeduction = 0;
    violations.forEach((v) => {
      if (v.severity === 'high') scoreDeduction += 25;
      else if (v.severity === 'medium') scoreDeduction += 10;
      else scoreDeduction += 5;
    });

    const scorePercent = Math.max(0, baseScore - scoreDeduction);

    return {
      isValid: scorePercent >= 75,
      violations,
      scorePercent,
    };
  }

  /**
   * Extract anatomical structure mentions from text
   */
  private extractStructureMentions(text: string): string[] {
    const mentions: string[] = [];

    // Match capitalized words that look like structure names
    const potentialStructures = text.match(/\b[A-Z][a-z]+(?:\s+[a-z]+)?\b/g) || [];

    potentialStructures.forEach((word) => {
      if (
        !this.isCommonWord(word) &&
        !this.isQuotedOrItalicized(text, word)
      ) {
        mentions.push(word);
      }
    });

    return [...new Set(mentions)]; // Remove duplicates
  }

  /**
   * Detect common hallucination patterns
   */
  private detectHallucinations(
    response: string
  ): SourceCheckResult['violations'] {
    const violations: SourceCheckResult['violations'] = [];

    // Pattern: "[Structure] is also known as [made-up term]"
    const unknownAliases = response.match(
      /(?:also known as|referred to as|called)\s+[a-z\s]+(?:bone|joint|process)/gi
    );
    if (unknownAliases) {
      unknownAliases.forEach((alias) => {
        violations.push({
          type: 'unsourced_claim',
          claim: alias,
          severity: 'medium',
          explanation: 'Potential made-up anatomical term',
        });
      });
    }

    // Pattern: Very specific measurements not in FMA
    const specificMeasurements = response.match(
      /approximately\s+\d+(?:\.\d+)?\s*(?:mm|cm|inches?|cm³|cc)\b/gi
    );
    if (specificMeasurements && specificMeasurements.length > 2) {
      violations.push({
        type: 'external_knowledge',
        claim: 'Multiple specific measurements',
        severity: 'low',
        explanation: 'Detailed measurements may exceed FMA data precision',
      });
    }

    // Pattern: Confidence claims about facts not provided
    const unsubstantiatedClaims = response.match(
      /\b(absolutely|definitely|undoubtedly|certainly)\s+[^.]*\b(fact|true|known)\b/gi
    );
    if (unsubstantiatedClaims) {
      unsubstantiatedClaims.forEach((claim) => {
        violations.push({
          type: 'unsourced_claim',
          claim: claim,
          severity: 'medium',
          explanation: 'Strong claim without citing provided sources',
        });
      });
    }

    return violations;
  }

  /**
   * Common English words to ignore
   */
  private isCommonWord(word: string): boolean {
    const common = [
      'The',
      'This',
      'That',
      'These',
      'Those',
      'Is',
      'Are',
      'Was',
      'Were',
      'Be',
      'Has',
      'Have',
      'How',
      'What',
      'When',
      'Where',
      'Why',
      'Which',
      'Would',
      'Could',
      'Should',
      'User',
      'Ask',
      'Tell',
      'Let',
      'Me',
      'You',
      'It',
    ];
    return common.includes(word);
  }

  /**
   * Check if word is a common anatomical term that might not be in DB
   */
  private isCommonAnatomicalTerm(word: string): boolean {
    const common = [
      'bone',
      'joint',
      'muscle',
      'organ',
      'system',
      'tissue',
      'nerve',
      'vessel',
      'artery',
      'vein',
      'ligament',
      'tendon',
      'cartilage',
      'brain',
      'heart',
      'lung',
      'left',
      'right',
      'anterior',
      'posterior',
      'medial',
      'lateral',
      'proximal',
      'distal',
      'superficial',
      'deep',
    ];
    return common.some((term) =>
      word.toLowerCase().includes(term.toLowerCase())
    );
  }

  /**
   * Check if word appears in quotes or special formatting
   */
  private isQuotedOrItalicized(text: string, word: string): boolean {
    const beforeWord = text.substring(0, text.indexOf(word));
    const openQuotes = (beforeWord.match(/"/g) || []).length;
    const openItalics = (beforeWord.match(/\*/g) || []).length;

    return openQuotes % 2 === 1 || openItalics % 2 === 1;
  }

  /**
   * Get detailed violation report for logging
   */
  formatViolationReport(result: SourceCheckResult): string {
    if (result.isValid) {
      return `✅ Response valid (${result.scorePercent}/100)`;
    }

    let report = `❌ Response contains unsourced information (${result.scorePercent}/100)\n\n`;
    report += `Violations found:\n`;

    result.violations.forEach((v, i) => {
      report += `${i + 1}. [${v.severity.toUpperCase()}] ${v.type}\n`;
      report += `   Claim: "${v.claim}"\n`;
      report += `   Issue: ${v.explanation}\n\n`;
    });

    return report;
  }
}

// Singleton instance
const sourceValidator = new SourceValidator();

export { sourceValidator, SourceCheckResult };
