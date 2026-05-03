/**
 * Cost Tracking System
 * Tracks cumulative API costs and provides budget alerts
 */

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const COST_TRACKER_FILE = join(__dirname, '../instructions/.cost-tracker.json');

export interface CostRecord {
  date: string; // ISO date string
  evalName: string;
  queriesRun: number;
  totalCostUSD: number;
  inputTokens: number;
  outputTokens: number;
}

export interface CostTracker {
  dailyBudgetUSD: number; // Alert when daily spend exceeds this
  monthliBudgetUSD: number; // Alert when monthly spend exceeds this
  records: CostRecord[];
}

const DEFAULT_TRACKER: CostTracker = {
  dailyBudgetUSD: 10,
  monthliBudgetUSD: 100,
  records: [],
};

/**
 * Load cost tracking data
 */
function loadTracker(): CostTracker {
  try {
    const data = readFileSync(COST_TRACKER_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return DEFAULT_TRACKER;
  }
}

/**
 * Save cost tracking data
 */
function saveTracker(tracker: CostTracker): void {
  writeFileSync(COST_TRACKER_FILE, JSON.stringify(tracker, null, 2));
}

/**
 * Record an eval run
 */
export function recordEvalRun(
  evalName: string,
  queriesRun: number,
  totalCostUSD: number,
  inputTokens: number,
  outputTokens: number,
): {
  dailyTotal: number;
  monthlyTotal: number;
  budgetWarnings: string[];
} {
  const tracker = loadTracker();
  const today = new Date().toISOString().split('T')[0];

  const record: CostRecord = {
    date: new Date().toISOString(),
    evalName,
    queriesRun,
    totalCostUSD,
    inputTokens,
    outputTokens,
  };

  tracker.records.push(record);
  saveTracker(tracker);

  // Calculate totals for today and this month
  const currentDate = new Date();
  const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);

  const dailyRecords = tracker.records.filter(
    (r) => r.date.split('T')[0] === today
  );
  const monthlyRecords = tracker.records.filter((r) => {
    const recordDate = new Date(r.date);
    return (
      recordDate >= monthStart &&
      recordDate.getFullYear() === currentDate.getFullYear() &&
      recordDate.getMonth() === currentDate.getMonth()
    );
  });

  const dailyTotal = dailyRecords.reduce((sum, r) => sum + r.totalCostUSD, 0);
  const monthlyTotal = monthlyRecords.reduce((sum, r) => sum + r.totalCostUSD, 0);

  // Check for budget alerts
  const warnings: string[] = [];
  if (dailyTotal > tracker.dailyBudgetUSD) {
    warnings.push(
      `⚠️  Daily budget exceeded! Spent $${dailyTotal.toFixed(2)} of $${tracker.dailyBudgetUSD}`
    );
  }
  if (monthlyTotal > tracker.monthliBudgetUSD) {
    warnings.push(
      `⚠️  Monthly budget exceeded! Spent $${monthlyTotal.toFixed(2)} of $${tracker.monthliBudgetUSD}`
    );
  }

  return { dailyTotal, monthlyTotal, budgetWarnings: warnings };
}

/**
 * Get cost summary
 */
export function getCostSummary(): {
  today: number;
  thisMonth: number;
  allTime: number;
  totalQueries: number;
  totalTokens: number;
} {
  const tracker = loadTracker();
  const today = new Date().toISOString().split('T')[0];
  const currentDate = new Date();
  const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);

  const dailyRecords = tracker.records.filter(
    (r) => r.date.split('T')[0] === today
  );
  const monthlyRecords = tracker.records.filter((r) => {
    const recordDate = new Date(r.date);
    return (
      recordDate >= monthStart &&
      recordDate.getFullYear() === currentDate.getFullYear() &&
      recordDate.getMonth() === currentDate.getMonth()
    );
  });

  return {
    today: dailyRecords.reduce((sum, r) => sum + r.totalCostUSD, 0),
    thisMonth: monthlyRecords.reduce((sum, r) => sum + r.totalCostUSD, 0),
    allTime: tracker.records.reduce((sum, r) => sum + r.totalCostUSD, 0),
    totalQueries: tracker.records.reduce((sum, r) => sum + r.queriesRun, 0),
    totalTokens: tracker.records.reduce((sum, r) => sum + r.inputTokens + r.outputTokens, 0),
  };
}

/**
 * Display cost summary in console
 */
export function displayCostSummary(currentRunCostUSD?: number, queriesInRun?: number): void {
  const summary = getCostSummary();
  const tracker = loadTracker();

  console.log('\n💰 COST SUMMARY');
  console.log('================');
  if (currentRunCostUSD !== undefined) {
    console.log(`This Run: $${currentRunCostUSD.toFixed(4)}`);
    if (queriesInRun) {
      console.log(`Cost per Query: $${(currentRunCostUSD / queriesInRun).toFixed(4)}`);
    }
  }
  console.log(`Today: $${summary.today.toFixed(4)} (Budget: $${tracker.dailyBudgetUSD})`);
  console.log(`This Month: $${summary.thisMonth.toFixed(2)} (Budget: $${tracker.monthliBudgetUSD})`);
  console.log(`All Time: $${summary.allTime.toFixed(2)}`);
  console.log(`Total Queries: ${summary.totalQueries}`);
  console.log(`Total Tokens: ${summary.totalTokens.toLocaleString()}`);
  console.log(`Avg Cost/Query: $${(summary.allTime / (summary.totalQueries || 1)).toFixed(4)}`);
}
