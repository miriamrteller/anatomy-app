import { VALID_SVG_IDS } from '../../frontend/public/svgs/existingbones';

/**
 * Eval Client: Core wrapper around /api/chat endpoint
 * 
 * Responsibilities:
 * 1. Send chat request with SSE streaming
 * 2. Parse SSE events in real-time
 * 3. Record metrics: latency, tokens, cost, tool calls
 * 4. Calculate accuracy against expected structures
 * 5. Validate SVG IDs in tool calls
 */

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface EvalQuery {
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

export interface SSEEvent {
  type: 'content' | 'tool_call' | 'done' | 'error';
  data: {
    content?: string;
    tool_name?: string;
    tool_input?: Record<string, unknown>;
    error?: string;
  };
}

export interface ToolCall {
  name: string;
  input: Record<string, unknown>;
  timestamp: number;
}

export interface RawToolCall {
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

export interface ChatMetrics {
  // Timing
  ttft_ms: number; // Time to first token
  total_latency_ms: number;
  
  // Tokens
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  
  // Cost (GPT-4o pricing)
  input_cost_usd: number;
  output_cost_usd: number;
  total_cost_usd: number;
  
  // Content
  full_response: string;
  tool_calls: ToolCall[];
  invalid_svg_ids: string[];
  
  // Timestamps
  start_time: number;
  first_token_time?: number;
  end_time?: number;
}

export interface EvalResult {
  query_id: string;
  query: string;
  category: string;
  difficulty: number;
  
  // Raw metrics
  metrics: ChatMetrics;
  
  // Accuracy scores
  rag_accuracy: {
    precision: number; // (correct structures) / (returned structures)
    recall: number; // (correct structures) / (expected structures)
    returned_structures: string[];
  };
  
  tool_accuracy: {
    precision: number; // (correct calls) / (total calls)
    recall: number; // (correct calls) / (expected calls)
    tool_calls_made: ToolCall[];
    expected_tools: string[];
  };
  
  response_quality: {
    has_all_must_contain: boolean;
    has_any_must_not_contain: boolean;
    manual_score?: number; // 0-10, requires human review
  };
  
  performance: {
    ttft_ok: boolean;
    latency_ok: boolean;
    ttft_target_ms: number;
    latency_target_ms: number;
  };
  
  cost: {
    within_budget: boolean;
    cost_target_usd: number;
  };
  
  // Summary
  overall_status: 'PASS' | 'FAIL' | 'FAIL_SVG_ID';
  pass_dimensions: number; // 0-5
}

// ============================================================================
// CONSTANTS
// ============================================================================

// OpenAI GPT-4o Pricing (April 2026)
const GPT4O_INPUT_COST_PER_TOKEN = 0.000005; // $5 per 1M tokens
const GPT4O_OUTPUT_COST_PER_TOKEN = 0.000015; // $15 per 1M tokens

// SLA Targets by Category (in milliseconds)
const SLA_TARGETS = {
  straightforward: { ttft: 1500, latency: 6000 },
  'common-student': { ttft: 2000, latency: 8000 },
  'system-specific': { ttft: 2500, latency: 10000 },
  'edge-case': { ttft: 2500, latency: 12000 },
  'multi-turn': { ttft: 2000, latency: 10000 },
};

// Cost Targets by Category
const COST_TARGETS = {
  straightforward: 0.0135,
  'common-student': 0.0213,
  'system-specific': 0.0393,
  'edge-case': 0.0327,
  'multi-turn': 0.0200,
};

// ============================================================================
// EVAL CLIENT
// ============================================================================

export class EvalClient {
  private apiBaseUrl: string;
  private chatEndpoint: string;

  constructor(baseUrl: string = 'http://localhost:3000') {
    this.apiBaseUrl = baseUrl;
    this.chatEndpoint = `${baseUrl}/api/chat`;
  }

  /**
   * Execute a single eval query
   */
  async evaluateQuery(query: EvalQuery): Promise<EvalResult> {
    const metrics = await this.executeQuery(query.query);
    const result = this.calculateAccuracy(query, metrics);
    return result;
  }

  /**
   * Send chat request and collect metrics from SSE stream
   */
  private async executeQuery(userQuery: string): Promise<ChatMetrics> {
    const metrics: ChatMetrics = {
      ttft_ms: -1,
      total_latency_ms: -1,
      input_tokens: 0,
      output_tokens: 0,
      total_tokens: 0,
      input_cost_usd: 0,
      output_cost_usd: 0,
      total_cost_usd: 0,
      full_response: '',
      tool_calls: [],
      invalid_svg_ids: [],
      start_time: Date.now(),
    };

    try {
      const response = await fetch(this.chatEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userQuery }),
      });

      if (!response.ok) {
        throw new Error(`Chat API returned ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      // Process SSE stream
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer

        for (const line of lines) {
          this.processSSELine(line, metrics);
        }
      }

      // Process final buffer content
      if (buffer) {
        this.processSSELine(buffer, metrics);
      }

      metrics.end_time = Date.now();
      metrics.total_latency_ms = metrics.end_time - metrics.start_time;

      // Calculate cost
      this.calculateCost(metrics);

      return metrics;
    } catch (error) {
      console.error('Error executing query:', error);
      throw error;
    }
  }

  /**
   * Process a single SSE line
   */
  private processSSELine(line: string, metrics: ChatMetrics): void {
    if (!line.startsWith('data: ')) return;

    const dataStr = line.slice(6); // Remove "data: "
    if (dataStr === '[DONE]') return;

    try {
      const data = JSON.parse(dataStr);

      // Record first token time
      if (metrics.ttft_ms === -1 && data.type === 'content_block_delta') {
        metrics.ttft_ms = Date.now() - metrics.start_time;
        metrics.first_token_time = Date.now();
      }

      // Process different event types
      if (data.type === 'content_block_delta' && data.delta?.type === 'text_delta') {
        metrics.full_response += data.delta.text;
      }

      if (data.type === 'content_block_delta' && data.delta?.type === 'input_json_delta') {
        // Tool input streaming
        this.processTool(data, metrics);
      }

      if (data.type === 'message_start') {
        if (data.message?.usage) {
          metrics.input_tokens = data.message.usage.input_tokens;
        }
      }

      if (data.type === 'message_delta') {
        if (data.usage) {
          metrics.output_tokens = data.usage.output_tokens;
        }
      }

      if (data.type === 'message_stop') {
        // Final message, extract token counts if present
        if (data.message?.usage) {
          metrics.input_tokens = data.message.usage.input_tokens;
          metrics.output_tokens = data.message.usage.output_tokens;
        }
      }
    } catch (e) {
      // Silently ignore parse errors from partial SSE data
    }
  }

  /**
   * Extract and validate tool calls from streaming response
   */
  private processTool(data: unknown, metrics: ChatMetrics): void {
    // Tool calls will be parsed from the full response at the end
    // This is a placeholder for streaming tool arguments
  }

  /**
   * Extract tool calls from final response
   * Looks for function_calls in the message content
   */
  private extractToolCalls(response: string): ToolCall[] {
    const toolCalls: ToolCall[] = [];

    // Parse Anthropic-style tool use blocks if present
    // This is fragile; in production, would use structured response format
    // For now, this is a skeleton for real tool parsing

    // In a real implementation, parse from OpenAI's tool_calls in response
    // For MVP, rely on the API to parse tools correctly

    return toolCalls;
  }

  /**
   * Calculate cost based on token counts
   */
  private calculateCost(metrics: ChatMetrics): void {
    metrics.input_cost_usd = metrics.input_tokens * GPT4O_INPUT_COST_PER_TOKEN;
    metrics.output_cost_usd = metrics.output_tokens * GPT4O_OUTPUT_COST_PER_TOKEN;
    metrics.total_cost_usd = metrics.input_cost_usd + metrics.output_cost_usd;
    metrics.total_tokens = metrics.input_tokens + metrics.output_tokens;
  }

  /**
   * Calculate accuracy against expected structures, tools, and quality
   */
  private calculateAccuracy(query: EvalQuery, metrics: ChatMetrics): EvalResult {
    const result: EvalResult = {
      query_id: query.id,
      query: query.query,
      category: query.category,
      difficulty: query.difficulty,
      metrics,
      
      // Initialize accuracy sections
      rag_accuracy: {
        precision: 0,
        recall: 0,
        returned_structures: [],
      },
      
      tool_accuracy: {
        precision: 0,
        recall: 0,
        tool_calls_made: metrics.tool_calls,
        expected_tools: query.expectedToolCalls,
      },
      
      response_quality: {
        has_all_must_contain: false,
        has_any_must_not_contain: false,
      },
      
      performance: {
        ttft_ok: false,
        latency_ok: false,
        ttft_target_ms: SLA_TARGETS[query.category as keyof typeof SLA_TARGETS]?.ttft || 2500,
        latency_target_ms: SLA_TARGETS[query.category as keyof typeof SLA_TARGETS]?.latency || 10000,
      },
      
      cost: {
        within_budget: false,
        cost_target_usd: COST_TARGETS[query.category as keyof typeof COST_TARGETS] || 0.025,
      },
      
      overall_status: 'PASS',
      pass_dimensions: 0,
    };

    // Calculate RAG accuracy
    this.calculateRAGAccuracy(query, metrics, result);

    // Calculate tool accuracy
    this.calculateToolAccuracy(query, metrics, result);

    // Calculate response quality
    this.calculateResponseQuality(query, metrics, result);

    // Check performance
    this.checkPerformance(result);

    // Check cost
    result.cost.within_budget = metrics.total_cost_usd <= result.cost.cost_target_usd;

    // Count passing dimensions
    result.pass_dimensions = this.countPassDimensions(result);

    // Determine overall status
    if (metrics.invalid_svg_ids.length > 0) {
      result.overall_status = 'FAIL_SVG_ID'; // Zero tolerance for invalid SVG IDs
    } else if (result.pass_dimensions < 3) {
      result.overall_status = 'FAIL';
    } else {
      result.overall_status = 'PASS';
    }

    return result;
  }

  /**
   * Calculate RAG precision and recall based on expected structures
   * 
   * Extracts structure mentions from response and checks against valid SVG IDs
   */
  private calculateRAGAccuracy(
    query: EvalQuery,
    metrics: ChatMetrics,
    result: EvalResult
  ): void {
    const returnedStructures = this.extractStructuresFromResponse(metrics.full_response);
    result.rag_accuracy.returned_structures = returnedStructures;

    if (query.expectedStructures.length === 0) {
      // Query doesn't expect any structures (factual question)
      result.rag_accuracy.precision = 1.0;
      result.rag_accuracy.recall = 1.0;
      return;
    }

    // Calculate precision: correct / returned
    const correctStructures = returnedStructures.filter((s) =>
      query.expectedStructures.includes(s)
    );
    result.rag_accuracy.precision =
      returnedStructures.length > 0 ? correctStructures.length / returnedStructures.length : 0;

    // Calculate recall: correct / expected
    result.rag_accuracy.recall =
      query.expectedStructures.length > 0 ? correctStructures.length / query.expectedStructures.length : 0;
  }

  /**
   * Calculate tool calling accuracy
   * 
   * For MVP, this validates that tool_calls (if made) use valid SVG IDs
   */
  private calculateToolAccuracy(
    query: EvalQuery,
    metrics: ChatMetrics,
    result: EvalResult
  ): void {
    // Extract tools actually called
    const toolsCalled = metrics.tool_calls.map((tc) => tc.name);

    // Check for invalid SVG IDs in highlight_structures calls
    for (const tc of metrics.tool_calls) {
      if (tc.name === 'highlight_structures') {
        const structures = tc.input.structures as string[] | undefined;
        if (structures) {
          for (const struct of structures) {
            if (!VALID_SVG_IDS.includes(struct)) {
              metrics.invalid_svg_ids.push(struct);
            }
          }
        }
      }
    }

    if (query.expectedToolCalls.length === 0) {
      // Query doesn't expect tool calls (factual question)
      result.tool_accuracy.precision = toolsCalled.length === 0 ? 1.0 : 0.5;
      result.tool_accuracy.recall = 1.0;
      return;
    }

    // Calculate precision: correct / called
    const correctTools = toolsCalled.filter((t) => query.expectedToolCalls.includes(t));
    result.tool_accuracy.precision =
      toolsCalled.length > 0 ? correctTools.length / toolsCalled.length : 0;

    // Calculate recall: correct / expected
    result.tool_accuracy.recall =
      query.expectedToolCalls.length > 0 ? correctTools.length / query.expectedToolCalls.length : 0;
  }

  /**
   * Calculate response quality based on answerMustContain/MustNotContain
   */
  private calculateResponseQuality(
    query: EvalQuery,
    metrics: ChatMetrics,
    result: EvalResult
  ): void {
    const response = metrics.full_response.toLowerCase();

    // Check must contain
    result.response_quality.has_all_must_contain = query.answerMustContain.every((item) =>
      response.includes(item.toLowerCase())
    );

    // Check must not contain
    result.response_quality.has_any_must_not_contain = query.answerMustNotContain.some((item) =>
      response.includes(item.toLowerCase())
    );
  }

  /**
   * Check performance against SLA
   */
  private checkPerformance(result: EvalResult): void {
    result.performance.ttft_ok = result.metrics.ttft_ms > 0 && result.metrics.ttft_ms <= result.performance.ttft_target_ms;
    result.performance.latency_ok = result.metrics.total_latency_ms <= result.performance.latency_target_ms;
  }

  /**
   * Count how many dimensions are passing
   * 
   * Dimensions: RAG, Tools, Quality, Performance, Cost
   */
  private countPassDimensions(result: EvalResult): number {
    let count = 0;

    // RAG: precision and recall >= 0.8
    if (result.rag_accuracy.precision >= 0.8 && result.rag_accuracy.recall >= 0.8) {
      count++;
    }

    // Tools: precision and recall >= 0.9, AND no invalid SVG IDs
    if (
      result.tool_accuracy.precision >= 0.9 &&
      result.tool_accuracy.recall >= 0.9 &&
      result.metrics.invalid_svg_ids.length === 0
    ) {
      count++;
    }

    // Quality: has all must-contain AND no must-not-contain
    if (
      result.response_quality.has_all_must_contain &&
      !result.response_quality.has_any_must_not_contain
    ) {
      count++;
    }

    // Performance: both TTFT and latency OK
    if (result.performance.ttft_ok && result.performance.latency_ok) {
      count++;
    }

    // Cost: within budget
    if (result.cost.within_budget) {
      count++;
    }

    return count;
  }

  /**
   * Extract structure names from response text
   * 
   * Looks for exact matches of valid SVG ID names in the response
   */
  private extractStructuresFromResponse(response: string): string[] {
    const found = new Set<string>();
    const responseLower = response.toLowerCase();

    for (const id of VALID_SVG_IDS) {
      // Simple substring match; in production might use regex with word boundaries
      if (responseLower.includes(id.toLowerCase())) {
        found.add(id);
      }
    }

    return Array.from(found);
  }

  /**
   * Batch evaluate multiple queries
   */
  async batchEvaluate(queries: EvalQuery[]): Promise<EvalResult[]> {
    const results: EvalResult[] = [];

    for (const query of queries) {
      try {
        const result = await this.evaluateQuery(query);
        results.push(result);
      } catch (error) {
        console.error(`Error evaluating query ${query.id}:`, error);
        // Continue with next query
      }
    }

    return results;
  }

  /**
   * Generate evaluation report
   */
  generateReport(results: EvalResult[]): {
    overall_pass_rate: number;
    pass_count: number;
    fail_count: number;
    fail_svg_id_count: number;
    by_category: Record<string, { pass_rate: number; count: number; passed: number }>;
    by_dimension: Record<string, { pass_rate: number; threshold: number }>;
    average_cost_usd: number;
    total_cost_usd: number;
    average_latency_ms: number;
    p95_latency_ms: number;
  } {
    const report = {
      overall_pass_rate: 0,
      pass_count: 0,
      fail_count: 0,
      fail_svg_id_count: 0,
      by_category: {} as Record<string, { pass_rate: number; count: number; passed: number }>,
      by_dimension: {
        rag: { pass_rate: 0, threshold: 0.8 },
        tools: { pass_rate: 0, threshold: 0.9 },
        quality: { pass_rate: 0, threshold: 0.8 },
        performance: { pass_rate: 0, threshold: 0.8 },
        cost: { pass_rate: 0, threshold: 0.8 },
      },
      average_cost_usd: 0,
      total_cost_usd: 0,
      average_latency_ms: 0,
      p95_latency_ms: 0,
    };

    let totalCost = 0;
    const latencies: number[] = [];
    let ragPass = 0;
    let toolPass = 0;
    let qualityPass = 0;
    let perfPass = 0;
    let costPass = 0;

    for (const result of results) {
      // Count passes
      if (result.overall_status === 'PASS') {
        report.pass_count++;
      } else if (result.overall_status === 'FAIL_SVG_ID') {
        report.fail_svg_id_count++;
        report.fail_count++;
      } else {
        report.fail_count++;
      }

      // By category
      if (!report.by_category[result.category]) {
        report.by_category[result.category] = { pass_rate: 0, count: 0, passed: 0 };
      }
      report.by_category[result.category].count++;
      if (result.overall_status === 'PASS') {
        report.by_category[result.category].passed++;
      }

      // Aggregate metrics
      totalCost += result.metrics.total_cost_usd;
      latencies.push(result.metrics.total_latency_ms);

      // Dimension pass tracking
      if (result.rag_accuracy.precision >= 0.8 && result.rag_accuracy.recall >= 0.8) ragPass++;
      if (result.tool_accuracy.precision >= 0.9 && result.tool_accuracy.recall >= 0.9) toolPass++;
      if (result.response_quality.has_all_must_contain) qualityPass++;
      if (result.performance.ttft_ok && result.performance.latency_ok) perfPass++;
      if (result.cost.within_budget) costPass++;
    }

    // Calculate rates
    report.overall_pass_rate = results.length > 0 ? report.pass_count / results.length : 0;
    report.average_cost_usd = totalCost / results.length;
    report.total_cost_usd = totalCost;
    report.average_latency_ms = latencies.reduce((a, b) => a + b, 0) / latencies.length;

    // P95 latency
    latencies.sort((a, b) => a - b);
    report.p95_latency_ms = latencies[Math.floor(latencies.length * 0.95)];

    // Dimension pass rates
    report.by_dimension.rag.pass_rate = results.length > 0 ? ragPass / results.length : 0;
    report.by_dimension.tools.pass_rate = results.length > 0 ? toolPass / results.length : 0;
    report.by_dimension.quality.pass_rate = results.length > 0 ? qualityPass / results.length : 0;
    report.by_dimension.performance.pass_rate = results.length > 0 ? perfPass / results.length : 0;
    report.by_dimension.cost.pass_rate = results.length > 0 ? costPass / results.length : 0;

    // Category pass rates
    for (const category in report.by_category) {
      const cat = report.by_category[category];
      cat.pass_rate = cat.count > 0 ? cat.passed / cat.count : 0;
    }

    return report;
  }
}

// ============================================================================
// EXPORT SINGLETON INSTANCE
// ============================================================================

export const evalClient = new EvalClient();
