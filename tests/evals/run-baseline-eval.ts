/**
 * Baseline Eval Runner for Phase 6
 * 
 * Executes all 77 benchmark queries against the live backend
 * and generates a comprehensive evaluation report.
 * 
 * Usage:
 *   npx ts-node tests/evals/run-baseline-eval.ts
 * 
 * Prerequisites:
 *   - Backend running on http://localhost:3000
 *   - /api/chat endpoint available
 *   - benchmark-dataset.json populated
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// ESM compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Placeholder types (eval-client.ts imports are complex)
interface EvalQuery {
  id: string;
  category: string;
  difficulty: number;
  query: string;
  description: string;
  expectedStructures: string[];
  expectedToolCalls: string[];
  expectedSystems: string[];
  answerMustContain: string[];
  answerMustNotContain: string[];
  notes: string;
}

interface EvalResult {
  queryId: string;
  passed: boolean;
  passedDimensions: number;
  totalDimensions: number;
  accuracyScores: any;
  metrics: any;
}

interface BaselineReport {
  timestamp: string;
  totalQueries: number;
  totalPassed: number;
  totalFailed: number;
  overallPassRate: number;
  byCategory: {
    [category: string]: {
      total: number;
      passed: number;
      failed: number;
      passRate: number;
      averageCost: number;
      averageTTFT: number;
      averageE2E: number;
    };
  };
  byDimension: {
    [dimension: string]: {
      passed: number;
      failed: number;
      passRate: number;
    };
  };
  failedQueries: Array<{
    id: string;
    category: string;
    query: string;
    failedDimensions: string[];
    reason: string;
  }>;
  topSlowQueries: Array<{
    id: string;
    e2eLatency: number;
    query: string;
  }>;
  topExpensiveQueries: Array<{
    id: string;
    estimatedCost: number;
    query: string;
  }>;
}

async function runBaselineEval() {
  console.log('\n🧪 Phase 6 Baseline Eval Runner');
  console.log('================================\n');

  // Load benchmark dataset
  const datasetPath = path.join(__dirname, 'benchmark-dataset.json');
  if (!fs.existsSync(datasetPath)) {
    console.error('❌ benchmark-dataset.json not found');
    process.exit(1);
  }

  const queries: EvalQuery[] = JSON.parse(fs.readFileSync(datasetPath, 'utf-8'));
  console.log(`📋 Loaded ${queries.length} queries from benchmark-dataset.json\n`);

  // Initialize eval client
  const evalClient = new EvalClient('http://localhost:3000');

  // Track results
  const results: EvalResult[] = [];
  const failedQueries: EvalResult[] = [];
  const startTime = Date.now();

  console.log('Starting evaluation...\n');

  // Run each query sequentially
  for (let i = 0; i < queries.length; i++) {
    const query = queries[i];
    const progress = `[${i + 1}/${queries.length}]`;

    try {
      console.log(`${progress} Evaluating: ${query.id}`);
      const result = await evalClient.evaluateQuery(query);
      results.push(result);

      if (!result.passed) {
        failedQueries.push(result);
        console.log(
          `   ❌ Failed (${result.passedDimensions}/${result.totalDimensions} dimensions)`
        );
      } else {
        console.log(`   ✅ Passed`);
      }
    } catch (error) {
      console.log(
        `   ⚠️  Error: ${error instanceof Error ? error.message : String(error)}`
      );
    }

    // Every 10 queries, show progress summary
    if ((i + 1) % 10 === 0) {
      const passedSoFar = results.filter((r) => r.passed).length;
      const passRate = ((passedSoFar / results.length) * 100).toFixed(1);
      console.log(`   Progress: ${passedSoFar}/${results.length} passed (${passRate}%)\n`);
    }
  }

  // Generate report
  console.log('\n📊 Generating baseline report...\n');

  const report = generateReport(results, queries);
  const elapsedMins = ((Date.now() - startTime) / 1000 / 60).toFixed(1);

  console.log(`\n✅ Evaluation Complete (${elapsedMins} minutes)`);
  console.log('\n📈 BASELINE REPORT');
  console.log('==================\n');

  console.log(`Overall Pass Rate: ${report.overallPassRate.toFixed(1)}%`);
  console.log(`Total Queries: ${report.totalQueries}`);
  console.log(`Passed: ${report.totalPassed} | Failed: ${report.totalFailed}\n`);

  console.log('By Category:');
  Object.entries(report.byCategory).forEach(([category, stats]) => {
    console.log(
      `  ${category.padEnd(20)} ${stats.passed}/${stats.total} (${stats.passRate.toFixed(1)}%) | ` +
        `Avg Cost: $${stats.averageCost.toFixed(4)} | ` +
        `TTFT: ${stats.averageTTFT.toFixed(0)}ms | ` +
        `E2E: ${stats.averageE2E.toFixed(0)}ms`
    );
  });

  console.log('\nBy Dimension:');
  Object.entries(report.byDimension).forEach(([dimension, stats]) => {
    console.log(
      `  ${dimension.padEnd(25)} ${stats.passed} passed, ${stats.failed} failed (${stats.passRate.toFixed(1)}%)`
    );
  });

  if (failedQueries.length > 0) {
    console.log(`\n❌ Failed Queries (${failedQueries.length}):`);
    report.failedQueries.slice(0, 10).forEach((q) => {
      console.log(`  - ${q.id}: ${q.query}`);
      console.log(`    Failed dimensions: ${q.failedDimensions.join(', ')}`);
    });
    if (report.failedQueries.length > 10) {
      console.log(`  ... and ${report.failedQueries.length - 10} more`);
    }
  }

  console.log('\n⏱️  Top 5 Slowest Queries:');
  report.topSlowQueries.forEach((q) => {
    console.log(`  - ${q.id}: ${(q.e2eLatency / 1000).toFixed(2)}s - ${q.query}`);
  });

  console.log('\n💰 Top 5 Most Expensive Queries:');
  report.topExpensiveQueries.forEach((q) => {
    console.log(`  - ${q.id}: $${q.estimatedCost.toFixed(4)} - ${q.query}`);
  });

  // Save full report
  const reportPath = path.join(__dirname, 'baseline-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n📁 Full report saved to: baseline-report.json`);

  // Save detailed results
  const resultsPath = path.join(__dirname, 'baseline-results.json');
  fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));
  console.log(`📁 Detailed results saved to: baseline-results.json\n`);

  return report.overallPassRate >= 90 ? 0 : 1;
}

function generateReport(results: EvalResult[], queries: EvalQuery[]): BaselineReport {
  const passed = results.filter((r) => r.passed).length;
  const failed = results.length - passed;

  // Category breakdown
  const byCategory: Record<string, any> = {};
  results.forEach((result) => {
    const query = queries.find((q) => q.id === result.queryId);
    if (!query) return;

    const cat = query.category;
    if (!byCategory[cat]) {
      byCategory[cat] = {
        total: 0,
        passed: 0,
        costs: [],
        ttfts: [],
        e2es: [],
      };
    }
    byCategory[cat].total++;
    if (result.passed) byCategory[cat].passed++;
    if (result.metrics.estimatedCost)
      byCategory[cat].costs.push(result.metrics.estimatedCost);
    if (result.metrics.timeToFirstToken)
      byCategory[cat].ttfts.push(result.metrics.timeToFirstToken);
    if (result.metrics.endToEndLatency)
      byCategory[cat].e2es.push(result.metrics.endToEndLatency);
  });

  const categoryStats: Record<string, any> = {};
  Object.entries(byCategory).forEach(([cat, data]) => {
    categoryStats[cat] = {
      total: data.total,
      passed: data.passed,
      failed: data.total - data.passed,
      passRate: (data.passed / data.total) * 100,
      averageCost:
        data.costs.length > 0 ? data.costs.reduce((a: number, b: number) => a + b) / data.costs.length : 0,
      averageTTFT:
        data.ttfts.length > 0
          ? data.ttfts.reduce((a: number, b: number) => a + b) / data.ttfts.length
          : 0,
      averageE2E:
        data.e2es.length > 0 ? data.e2es.reduce((a: number, b: number) => a + b) / data.e2es.length : 0,
    };
  });

  // Dimension breakdown
  const byDimension: Record<string, any> = {
    'RAG Accuracy': { passed: 0, failed: 0 },
    'Tool Correctness': { passed: 0, failed: 0 },
    'Response Quality': { passed: 0, failed: 0 },
    Performance: { passed: 0, failed: 0 },
    'Cost Tracking': { passed: 0, failed: 0 },
  };

  results.forEach((result) => {
    const dimensions = [
      'RAG Accuracy',
      'Tool Correctness',
      'Response Quality',
      'Performance',
      'Cost Tracking',
    ];
    dimensions.forEach((dim) => {
      if (result.accuracyScores[dim.toLowerCase().replace(/ /g, '_')] >= 0.7) {
        byDimension[dim].passed++;
      } else {
        byDimension[dim].failed++;
      }
    });
  });

  const dimensionStats: Record<string, any> = {};
  Object.entries(byDimension).forEach(([dim, data]) => {
    const total = data.passed + data.failed;
    dimensionStats[dim] = {
      passed: data.passed,
      failed: data.failed,
      passRate: total > 0 ? (data.passed / total) * 100 : 0,
    };
  });

  // Failed queries
  const failedQueryDetails = results
    .filter((r) => !r.passed)
    .map((result) => {
      const query = queries.find((q) => q.id === result.queryId);
      return {
        id: result.queryId,
        category: query?.category || 'unknown',
        query: query?.query || '',
        failedDimensions: Object.entries(result.accuracyScores)
          .filter(([_, score]) => (score as number) < 0.7)
          .map(([dim]) => dim),
        reason: `${result.passedDimensions}/${result.totalDimensions} dimensions passed`,
      };
    });

  // Top slow queries
  const topSlowQueries = results
    .sort((a, b) => (b.metrics.endToEndLatency || 0) - (a.metrics.endToEndLatency || 0))
    .slice(0, 5)
    .map((result) => {
      const query = queries.find((q) => q.id === result.queryId);
      return {
        id: result.queryId,
        e2eLatency: result.metrics.endToEndLatency || 0,
        query: query?.query || '',
      };
    });

  // Top expensive queries
  const topExpensiveQueries = results
    .sort((a, b) => (b.metrics.estimatedCost || 0) - (a.metrics.estimatedCost || 0))
    .slice(0, 5)
    .map((result) => {
      const query = queries.find((q) => q.id === result.queryId);
      return {
        id: result.queryId,
        estimatedCost: result.metrics.estimatedCost || 0,
        query: query?.query || '',
      };
    });

  return {
    timestamp: new Date().toISOString(),
    totalQueries: results.length,
    totalPassed: passed,
    totalFailed: failed,
    overallPassRate: (passed / results.length) * 100,
    byCategory: categoryStats,
    byDimension: dimensionStats,
    failedQueries: failedQueryDetails,
    topSlowQueries,
    topExpensiveQueries,
  };
}

// Run evaluation
runBaselineEval()
  .then((exitCode) => process.exit(exitCode))
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
