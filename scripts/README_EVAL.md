# Evaluation Runner

Automated evaluation tool for the anatomy chatbot system that executes the benchmark dataset against the live API and generates comprehensive metrics.

## Prerequisites

1. Backend must be running: `npm run dev` (from root directory)
2. API should be available at `http://localhost:3000`
3. Benchmark dataset must exist at `tests/evals/benchmark-dataset.json`

## Running the Evaluation

```bash
npm run eval
```

The runner will:
1. Load 65 benchmark queries from the dataset
2. Send each query to the chat API
3. Track response latency (TTFT, E2E), token usage, and costs
4. Validate tool calls, SVG structure IDs, and response quality
5. Generate a summary report with metrics by category

## Output

Results are saved to `tests/evals/eval-results.json` containing:

### Summary Metrics
- **Pass Rate**: % of queries meeting all success criteria
- **Latency**: Average TTFT (time to first token) and E2E (end-to-end) latency
- **Cost**: Total API cost and average per query
- **Quality**: Tool precision/recall, structure detection precision/recall, SVG ID validation rate

### By Category
Metrics broken down by query category:
- `straightforward`: Simple anatomical questions
- `common-student`: Common student misconceptions
- `system-specific`: System-level anatomy questions
- `edge-case`: Challenging or ambiguous questions

## Success Criteria

A query passes if:
- Tool precision ≥ 80%
- Tool recall ≥ 70%
- Structure precision ≥ 85%
- Structure recall ≥ 70%
- All required facts in response (must-contain guidelines)
- No incorrect facts in response (must-not-contain guidelines)
- Zero invalid SVG IDs
- E2E latency ≤ 15 seconds

## Interpreting Results

### Latency SLAs
- **Straightforward**: TTFT 1500ms, E2E 6000ms
- **Common-Student**: TTFT 1800ms, E2E 8000ms
- **System-Specific**: TTFT 2000ms, E2E 10000ms
- **Edge-Case**: TTFT 2500ms, E2E 12000ms

### Cost Budgets
- **Straightforward**: $0.0135 per query
- **Common-Student**: $0.0256 per query
- **System-Specific**: $0.0393 per query
- **Edge-Case**: $0.0512 per query

## Troubleshooting

### "API call failed"
- Ensure backend is running: `npm run dev`
- Check API is accessible at http://localhost:3000/api/chat
- Check backend logs for errors

### High latency
- Check backend resource usage
- Consider reducing batch size or adding delays between requests

### Low pass rate
- Review individual query results in eval-results.json
- Check error fields for specific failures
- Examine tool calls and structure detection accuracy
