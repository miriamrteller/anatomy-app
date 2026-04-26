/**
 * Evaluation Runner
 *
 * Executes the benchmark dataset against the live API and generates evaluation metrics.
 * Tracks:
 * - Response latency (TTFT, E2E)
 * - Token usage and costs
 * - Tool precision/recall
 * - SVG ID accuracy
 * - Response quality
 */

import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import { VALID_SVG_IDS, isValidSvgId } from "../tests/evals/types";
import { recordEvalRun, displayCostSummary } from "./cost-tracker";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Types
interface EvalQuery {
  id: string;
  category: string;
  difficulty: number;
  query: string;
  expectedStructures: string[];
  expectedToolCalls: string[];
  expectedSystems: string[];
  answerMustContain: string[];
  answerMustNotContain: string[];
}

interface EvalResult {
  queryId: string;
  category: string;
  query: string;
  passed: boolean;
  metrics: {
    latencyTTFT_ms: number;
    latencyE2E_ms: number;
    inputTokens: number;
    outputTokens: number;
    costUSD: number;
  };
  tools: {
    expected: string[];
    actual: string[];
    precision: number;
    recall: number;
  };
  structures: {
    expected: string[];
    actual: string[];
    precision: number;
    recall: number;
    invalidIds: string[];
  };
  quality: {
    mustContainMet: boolean;
    mustNotContainViolations: string[];
  };
  errors: string[];
}

interface EvalSummary {
  totalQueries: number;
  passedQueries: number;
  passRate: number;
  byCategory: Record<
    string,
    {
      count: number;
      passed: number;
      passRate: number;
      avgLatencyE2E_ms: number;
      avgCostUSD: number;
    }
  >;
  aggregateMetrics: {
    avgLatencyTTFT_ms: number;
    avgLatencyE2E_ms: number;
    avgInputTokens: number;
    avgOutputTokens: number;
    totalCostUSD: number;
  };
  tools: {
    avgPrecision: number;
    avgRecall: number;
  };
  structures: {
    avgPrecision: number;
    avgRecall: number;
    invalidIdRate: number;
  };
  timestamp: string;
  duration_seconds: number;
}

// GPT-4o mini pricing (as of 2026-04)
const PRICING = {
  input_per_token: 0.00000015,  // $0.15 per 1M input tokens
  output_per_token: 0.000006,   // $6 per 1M output tokens
};

const API_BASE = "http://localhost:3000";
const TIMEOUT_MS = 30000;

async function callChatAPI(
  query: string,
  queryId: string,
): Promise<{
  response: string;
  toolCalls: string[];
  inputTokens: number;
  outputTokens: number;
  ttft_ms: number;
  e2e_ms: number;
} | null> {
  const startTime = Date.now();
  let ttftTime = 0;
  let toolCalls: string[] = [];

  try {
    const response = await fetch(`${API_BASE}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: query }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    if (!response.ok) {
      throw new Error(`API returned ${response.status}`);
    }

    let fullResponse = "";
    const reader = response.body?.getReader();
    if (!reader) throw new Error("No response body");

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = new TextDecoder().decode(value);
      fullResponse += chunk;

      // Estimate TTFT on first chunk
      if (ttftTime === 0 && fullResponse.length > 0) {
        ttftTime = Date.now() - startTime;
      }
    }

    const e2eTime = Date.now() - startTime;

    // DEBUG: Check what we got
    if (queryId === 'straightforward-001') {
      console.log('DEBUG fullResponse length:', fullResponse.length);
      console.log('DEBUG fullResponse preview:', fullResponse.substring(0, 500));
      console.log('DEBUG fullResponse contains "tool_call":', fullResponse.includes('tool_call'));
    }

    // Extract tool calls and usage from the complete SSE response
    // Split by \n\n to get individual SSE messages, then parse JSON
    const sseMessages = fullResponse.split('\n\n');
    let inputTokens = 100; // Fallback defaults
    let outputTokens = 150;
    
    for (const message of sseMessages) {
      if (message.trim().startsWith('data: ')) {
        try {
          const jsonStr = message.replace('data: ', '').trim();
          if (jsonStr) {
            const eventData = JSON.parse(jsonStr);
            
            // Extract tool calls
            if (eventData.event === 'tool_call' && eventData.data?.tool_name) {
              const toolName = eventData.data.tool_name;
              if (!toolCalls.includes(toolName)) {
                toolCalls.push(toolName);
              }
            }
            
            // Extract actual token usage from done event
            if (eventData.event === 'done' && eventData.data?.usage) {
              inputTokens = eventData.data.usage.inputTokens;
              outputTokens = eventData.data.usage.outputTokens;
            }
          }
        } catch {
          // Skip messages that aren't valid JSON (e.g., incomplete)
        }
      }
    }

    return {
      response: fullResponse,
      toolCalls,
      inputTokens,
      outputTokens,
      ttft_ms: ttftTime || e2eTime,
      e2e_ms: e2eTime,
    };
  } catch (error) {
    console.error(`Query ${queryId} failed:`, error);
    return null;
  }
}

function extractStructuresFromResponse(response: string): string[] {
  // Find valid SVG IDs mentioned in the response
  const responseLower = response.toLowerCase();
  const found: string[] = [];
  VALID_SVG_IDS.forEach((id) => {
    if (responseLower.includes(id)) {
      found.push(id);
    }
  });
  return found;
}

function calculatePrecisionRecall(
  expected: string[],
  actual: string[],
): { precision: number; recall: number } {
  if (expected.length === 0 && actual.length === 0)
    return { precision: 1, recall: 1 };
  if (expected.length === 0) return { precision: 0, recall: 1 };
  if (actual.length === 0) return { precision: 1, recall: 0 };

  const expectedSet = new Set(expected);
  const actualSet = new Set(actual);
  const intersection = [...actualSet].filter((x) => expectedSet.has(x)).length;

  return {
    precision: intersection / Math.max(actualSet.size, 1),
    recall: intersection / expectedSet.size,
  };
}

async function runEval(): Promise<void> {
  console.log("🧪 Starting Evaluation Run...\n");
  const startTime = Date.now();

  // Load benchmark dataset
  const datasetPath = path.join(
    __dirname,
    "../tests/evals/benchmark-dataset.json",
  );
  const queries: EvalQuery[] = JSON.parse(
    fs.readFileSync(datasetPath, "utf-8"),
  );
  console.log(`📊 Loaded ${queries.length} queries from benchmark dataset\n`);

  const results: EvalResult[] = [];

  // Run each query
  for (let i = 0; i < queries.length; i++) {
    const query = queries[i];
    process.stdout.write(
      `\r[${i + 1}/${queries.length}] Running ${query.id}...`,
    );

    const apiResult = await callChatAPI(query.query, query.id);
    if (!apiResult) {
      results.push({
        queryId: query.id,
        category: query.category,
        query: query.query,
        passed: false,
        metrics: {
          latencyTTFT_ms: 0,
          latencyE2E_ms: 0,
          inputTokens: 0,
          outputTokens: 0,
          costUSD: 0,
        },
        tools: {
          expected: query.expectedToolCalls,
          actual: [],
          precision: 0,
          recall: 0,
        },
        structures: {
          expected: query.expectedStructures,
          actual: [],
          precision: 0,
          recall: 0,
          invalidIds: [],
        },
        quality: { mustContainMet: false, mustNotContainViolations: [] },
        errors: ["API call failed"],
      });
      continue;
    }

    // Extract structures from response
    const actualStructures = extractStructuresFromResponse(apiResult.response);
    const invalidIds = actualStructures.filter((id) => !isValidSvgId(id));

    // Calculate metrics
    const toolMetrics = calculatePrecisionRecall(
      query.expectedToolCalls,
      apiResult.toolCalls,
    );
    const structureMetrics = calculatePrecisionRecall(
      query.expectedStructures,
      actualStructures,
    );

    // Check quality guidelines
    const responseLower = apiResult.response.toLowerCase();
    const mustContainMet = query.answerMustContain.every((term) =>
      responseLower.includes(term.toLowerCase()),
    );
    const mustNotContainViolations = query.answerMustNotContain.filter((term) =>
      responseLower.includes(term.toLowerCase()),
    );

    const costUSD =
      apiResult.inputTokens * PRICING.input_per_token +
      apiResult.outputTokens * PRICING.output_per_token;

    const passed =
      toolMetrics.precision >= 0.8 &&
      toolMetrics.recall >= 0.7 &&
      structureMetrics.precision >= 0.5 &&
      structureMetrics.recall >= 0.5 &&
      mustContainMet &&
      mustNotContainViolations.length === 0 &&
      invalidIds.length === 0 &&
      apiResult.e2e_ms <= 20000;

    results.push({
      queryId: query.id,
      category: query.category,
      query: query.query,
      passed,
      metrics: {
        latencyTTFT_ms: apiResult.ttft_ms,
        latencyE2E_ms: apiResult.e2e_ms,
        inputTokens: apiResult.inputTokens,
        outputTokens: apiResult.outputTokens,
        costUSD,
      },
      tools: {
        expected: query.expectedToolCalls,
        actual: apiResult.toolCalls,
        precision: toolMetrics.precision,
        recall: toolMetrics.recall,
      },
      structures: {
        expected: query.expectedStructures,
        actual: actualStructures,
        precision: structureMetrics.precision,
        recall: structureMetrics.recall,
        invalidIds,
      },
      quality: {
        mustContainMet,
        mustNotContainViolations,
      },
      errors: [],
    });

    // Rate limit to avoid overwhelming API
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  console.log("\n\n📈 Computing Summary...\n");

  // Compute summary
  const passedCount = results.filter((r) => r.passed).length;
  const duration = (Date.now() - startTime) / 1000;

  const byCategory: Record<string, EvalResult[]> = {};
  results.forEach((r) => {
    if (!byCategory[r.category]) byCategory[r.category] = [];
    byCategory[r.category].push(r);
  });

  const categoryStats = Object.entries(byCategory).reduce(
    (acc, [category, categoryResults]) => {
      const passed = categoryResults.filter((r) => r.passed).length;
      const avgLatency =
        categoryResults.reduce((sum, r) => sum + r.metrics.latencyE2E_ms, 0) /
        categoryResults.length;
      const avgCost =
        categoryResults.reduce((sum, r) => sum + r.metrics.costUSD, 0) /
        categoryResults.length;

      acc[category] = {
        count: categoryResults.length,
        passed,
        passRate: passed / categoryResults.length,
        avgLatencyE2E_ms: avgLatency,
        avgCostUSD: avgCost,
      };
      return acc;
    },
    {} as Record<string, any>,
  );

  const summary: EvalSummary = {
    totalQueries: results.length,
    passedQueries: passedCount,
    passRate: passedCount / results.length,
    byCategory: categoryStats,
    aggregateMetrics: {
      avgLatencyTTFT_ms:
        results.reduce((sum, r) => sum + r.metrics.latencyTTFT_ms, 0) /
        results.length,
      avgLatencyE2E_ms:
        results.reduce((sum, r) => sum + r.metrics.latencyE2E_ms, 0) /
        results.length,
      avgInputTokens:
        results.reduce((sum, r) => sum + r.metrics.inputTokens, 0) /
        results.length,
      avgOutputTokens:
        results.reduce((sum, r) => sum + r.metrics.outputTokens, 0) /
        results.length,
      totalCostUSD: results.reduce((sum, r) => sum + r.metrics.costUSD, 0),
    },
    tools: {
      avgPrecision:
        results.reduce((sum, r) => sum + r.tools.precision, 0) / results.length,
      avgRecall:
        results.reduce((sum, r) => sum + r.tools.recall, 0) / results.length,
    },
    structures: {
      avgPrecision:
        results.reduce((sum, r) => sum + r.structures.precision, 0) /
        results.length,
      avgRecall:
        results.reduce((sum, r) => sum + r.structures.recall, 0) /
        results.length,
      invalidIdRate:
        results.filter((r) => r.structures.invalidIds.length > 0).length /
        results.length,
    },
    timestamp: new Date().toISOString(),
    duration_seconds: duration,
  };

  // Print summary
  console.log("═══════════════════════════════════════════════════════════");
  console.log("                     EVALUATION RESULTS                      ");
  console.log("═══════════════════════════════════════════════════════════\n");

  console.log(
    `✅ Pass Rate: ${(summary.passRate * 100).toFixed(1)}% (${passedCount}/${results.length} queries)`,
  );
  console.log(`⏱️  Duration: ${duration.toFixed(1)} seconds\n`);

  console.log("By Category:");
  Object.entries(categoryStats).forEach(([category, stats]) => {
    console.log(
      `  ${category}: ${(stats.passRate * 100).toFixed(0)}% (${stats.passed}/${stats.count}) | ` +
        `E2E: ${stats.avgLatencyE2E_ms.toFixed(0)}ms | Cost: $${stats.avgCostUSD.toFixed(5)}`,
    );
  });

  console.log("\nAggregate Metrics:");
  console.log(
    `  TTFT: ${summary.aggregateMetrics.avgLatencyTTFT_ms.toFixed(0)}ms`,
  );
  console.log(
    `  E2E: ${summary.aggregateMetrics.avgLatencyE2E_ms.toFixed(0)}ms`,
  );
  console.log(
    `  Tokens: ${summary.aggregateMetrics.avgInputTokens.toFixed(0)} in / ${summary.aggregateMetrics.avgOutputTokens.toFixed(0)} out`,
  );
  console.log(
    `  Total Cost: $${summary.aggregateMetrics.totalCostUSD.toFixed(2)}\n`,
  );

  console.log("Quality Metrics:");
  console.log(
    `  Tool Precision: ${(summary.tools.avgPrecision * 100).toFixed(1)}%`,
  );
  console.log(`  Tool Recall: ${(summary.tools.avgRecall * 100).toFixed(1)}%`);
  console.log(
    `  Structure Precision: ${(summary.structures.avgPrecision * 100).toFixed(1)}%`,
  );
  console.log(
    `  Structure Recall: ${(summary.structures.avgRecall * 100).toFixed(1)}%`,
  );
  console.log(
    `  Invalid SVG ID Rate: ${(summary.structures.invalidIdRate * 100).toFixed(1)}%\n`,
  );

  // Save results
  const resultsFile = path.join(__dirname, "../tests/evals/eval-results.json");
  fs.writeFileSync(resultsFile, JSON.stringify({ summary, results }, null, 2));
  console.log(`📁 Results saved to ${resultsFile}\n`);

  // Record costs
  const costTracking = recordEvalRun(
    `eval-${new Date().toISOString().split('T')[0]}`,
    results.length,
    summary.aggregateMetrics.totalCostUSD,
    summary.aggregateMetrics.avgInputTokens * results.length,
    summary.aggregateMetrics.avgOutputTokens * results.length,
  );

  // Display cost summary and alerts
  displayCostSummary();
  if (costTracking.budgetWarnings.length > 0) {
    console.log('\n' + costTracking.budgetWarnings.join('\n'));
  }
}

runEval().catch(console.error);
