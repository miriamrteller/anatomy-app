/**
 * Manual Knowledge Boundary Test Runner
 * 
 * Usage:
 * 1. Start dev server in one terminal:
 *    npm run dev
 * 
 * 2. Run tests in another terminal:
 *    npx tsx scripts/test-knowledge-boundary.ts
 * 
 * Requirements:
 * - Dev server running on localhost:3000
 * - Database populated with structures
 * - FMA API configured (optional, will skip if not available)
 */

import { knowledgeBoundaryTests } from '../tests/evals/knowledge-boundary';

interface TestResult {
  id: string;
  description: string;
  passed: boolean;
  response: string;
  error?: string;
  duration: number;
}

const API_URL = 'http://localhost:3000/api/chat';
const TEST_TIMEOUT = 15000; // 15 seconds per test

class KnowledgeBoundaryTestRunner {
  private results: TestResult[] = [];
  private passCount = 0;
  private failCount = 0;

  async runTests(): Promise<void> {
    console.log('\n🧪 Knowledge Boundary Test Runner\n');
    console.log(`Testing ${knowledgeBoundaryTests.length} queries...\n`);

    // Verify server is running
    try {
      await this.checkServerHealth();
    } catch (error) {
      console.error('\n❌ ERROR: Dev server not running!\n');
      console.error('Start the server first:');
      console.error('  npm run dev\n');
      process.exit(1);
    }

    // Run each test
    for (const test of knowledgeBoundaryTests) {
      const result = await this.runTest(test);
      this.results.push(result);

      if (result.passed) {
        this.passCount++;
        console.log(`✅ ${test.id}: ${test.description}`);
      } else {
        this.failCount++;
        console.log(`❌ ${test.id}: ${test.description}`);
        if (result.error) {
          console.log(`   Error: ${result.error}`);
        } else {
          console.log(`   Response: "${result.response.substring(0, 100)}..."`);
        }
      }
    }

    // Print summary
    this.printSummary();
  }

  private async checkServerHealth(): Promise<void> {
    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: 'test' }),
      });

      if (!res.ok && res.status !== 400) {
        throw new Error(`Server returned ${res.status}`);
      }
    } catch (error) {
      throw new Error(`Cannot connect to ${API_URL}: ${error}`);
    }
  }

  private async runTest(test: any): Promise<TestResult> {
    const startTime = Date.now();

    try {
      const response = await this.queryAPI(test.query);
      const duration = Date.now() - startTime;

      const passed = test.checkFn(response);

      return {
        id: test.id,
        description: test.description,
        passed,
        response: response.substring(0, 200), // First 200 chars
        duration,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      return {
        id: test.id,
        description: test.description,
        passed: false,
        response: '',
        error: error instanceof Error ? error.message : 'Unknown error',
        duration,
      };
    }
  }

  private async queryAPI(question: string): Promise<string> {
    return new Promise((resolve, reject) => {
      let fullResponse = '';
      let hasStarted = false;

      const timeoutId = setTimeout(() => {
        reject(new Error(`Test timeout after ${TEST_TIMEOUT}ms`));
      }, TEST_TIMEOUT);

      fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question }),
      })
        .then((res) => {
          if (!res.body) throw new Error('No response body');
          return res.text();
        })
        .then((text) => {
          clearTimeout(timeoutId);

          // Parse SSE events from text
          const lines = text.split('\n');
          for (const line of lines) {
            if (line.startsWith('data:')) {
              try {
                const eventText = line.substring(5).trim();
                if (eventText) {
                  const data = JSON.parse(eventText);
                  if (data.event === 'token' && data.data) {
                    fullResponse += data.data;
                    hasStarted = true;
                  }
                }
              } catch {
                // Ignore parse errors
              }
            }
          }

          if (!hasStarted) {
            reject(new Error('No response tokens received'));
          } else {
            resolve(fullResponse);
          }
        })
        .catch((error) => {
          clearTimeout(timeoutId);
          reject(error);
        });
    });
  }

  private printSummary(): void {
    const total = this.passCount + this.failCount;
    const passRate = total > 0 ? ((this.passCount / total) * 100).toFixed(1) : '0';

    console.log('\n' + '='.repeat(60));
    console.log('TEST SUMMARY');
    console.log('='.repeat(60));
    console.log(`\nTotal Tests:    ${total}`);
    console.log(`Passed:         ${this.passCount} ✅`);
    console.log(`Failed:         ${this.failCount} ❌`);
    console.log(`Pass Rate:      ${passRate}%`);
    console.log(`Target:         ≥75%\n`);

    if (this.passCount >= total * 0.75) {
      console.log('✅ PASS: Ready for production!\n');
    } else {
      console.log('⚠️  WARNING: Below target pass rate. Review failures above.\n');
    }

    // Detailed results by category
    console.log('Results by Category:');
    console.log('-'.repeat(60));

    const byCategory: Record<string, TestResult[]> = {};
    for (const result of this.results) {
      const parts = result.id.split('-');
      const category = parts.slice(0, -1).join('-') || parts[0];
      if (!byCategory[category]) {
        byCategory[category] = [];
      }
      byCategory[category].push(result);
    }

    for (const [category, results] of Object.entries(byCategory)) {
      const categoryPass = results.filter((r) => r.passed).length;
      const categoryTotal = results.length;
      const categoryRate = ((categoryPass / categoryTotal) * 100).toFixed(0);
      console.log(`\n${category.toUpperCase()}: ${categoryPass}/${categoryTotal} (${categoryRate}%)`);
      for (const result of results) {
        const icon = result.passed ? '✅' : '❌';
        console.log(`  ${icon} ${result.id}`);
      }
    }

    console.log('\n' + '='.repeat(60));

    // Instructions
    console.log('\n📋 NEXT STEPS:\n');
    if (this.passCount >= total * 0.75) {
      console.log('✅ Tests passing! Ready to deploy.\n');
      console.log('1. Commit changes: git add . && git commit');
      console.log('2. Set env vars in Railway/Vercel (see PRODUCTION_ENV_VARS.md)');
      console.log('3. Deploy: git push');
      console.log('4. Verify in production\n');
    } else {
      console.log('⚠️ Tests failing. Debugging steps:\n');
      console.log('1. Check that dev server is running: npm run dev');
      console.log('2. Test FMA API: npx tsx scripts/test-fma-api.ts');
      console.log('3. Check system prompt: curl http://localhost:3000/api/system-prompt');
      console.log('4. Manual test in browser: npm run dev');
      console.log('5. See KNOWLEDGE_BOUNDARY_TESTING.md for details\n');
    }
  }
}

// Run tests
const runner = new KnowledgeBoundaryTestRunner();
runner.runTests().catch(console.error);
