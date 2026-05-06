# How to Run Tests Locally

## The Correct Way

The documentation previously referenced a `run-eval.ts` script that **doesn't exist**. Here's the correct way:

### Step 1: Start the Dev Server

```bash
npm run dev
```

This starts the backend on `http://localhost:3000`.

### Step 2: Run Tests in Another Terminal

```bash
npx tsx scripts/test-knowledge-boundary.ts
```

This runs the knowledge boundary tests against the running server.

### Expected Output

```
🧪 Knowledge Boundary Test Runner

Testing 15 queries...

✅ kb-refusal-01: Refuse out-of-scope structures
✅ kb-refusal-02: Refuse non-anatomical topics
❌ kb-refusal-03: Refuse detailed info beyond DB
✅ kb-sourced-01: Femur answers match FMA
...

============================================================
TEST SUMMARY
============================================================

Total Tests:    15
Passed:         12 ✅
Failed:         3 ❌
Pass Rate:      80.0%
Target:         ≥75%

✅ PASS: Ready for production!
```

## Why Tests Need a Running Server

The tests work by:
1. Sending HTTP requests to the chat API
2. Collecting the SSE (streaming) response
3. Checking if the response matches expected patterns
4. Reporting results

This is why you need the dev server running first.

## What If Tests Fail?

### "Cannot connect to http://localhost:3000"

**Fix:** Start the dev server first
```bash
npm run dev
```

### Tests show low pass rate (< 75%)

**Steps to debug:**
1. Check the server logs for errors
2. Verify FMA API is configured:
   ```bash
   npx tsx scripts/test-fma-api.ts
   ```
3. Check system prompt loaded:
   ```bash
   curl http://localhost:3000/api/system-prompt
   ```
4. Manual test:
   ```bash
   curl -X POST http://localhost:3000/api/chat \
     -H "Content-Type: application/json" \
     -d '{"question": "What is the femur?"}'
   ```

## How to Know It Will Work in Production

The test runner **simulates real API calls** just like production will receive. If tests pass locally with 75%+, you can be confident it will work in production because:

1. ✅ **Same code path** - Tests use the exact same `/api/chat` endpoint
2. ✅ **Same SSE streaming** - Tests parse the same SSE format the frontend receives
3. ✅ **Same LLM behavior** - Uses the same GPT-4 model and parameters
4. ✅ **Same database** - Uses the same database the production will use
5. ✅ **Same FMA API** - Uses the same BioPortal/SPARQL sources

**The only differences in production:**
- Database will have more/different data
- FMA API rate limit will reset daily
- Response times might be slightly different

But the **core logic** is identical.

## Production Verification Checklist

After deploying to production, verify:

```bash
# 1. Test the endpoint
curl -X POST https://your-prod-app/api/chat \
  -H "Content-Type: application/json" \
  -d '{"question": "What is the femur?"}'

# Expected: Response includes FMA data + highlighting

# 2. Check logs
railway logs | grep "[FMA]"

# Expected: [FMA] Searching for: "Femur"
#          [FMA] Rate limit remaining: 500
#          [Chat] Enriched...

# 3. Test a refusal
curl -X POST https://your-prod-app/api/chat \
  -H "Content-Type: application/json" \
  -d '{"question": "Tell me about the gnathos"}'

# Expected: "This is not my area of expertise..."
```

If these work, production is working correctly.

## Summary

| Step | Command | Purpose |
|------|---------|---------|
| 1 | `npm run dev` | Start backend server |
| 2 | `npx tsx scripts/test-knowledge-boundary.ts` | Run tests |
| 3 | Check logs | Verify no errors |
| 4 | Pass rate ≥75%? | Ready for production |

---

**Note:** The original documentation referenced `npx tsx scripts/run-eval.ts` which doesn't exist. Use `npx tsx scripts/test-knowledge-boundary.ts` instead. This has been corrected in [QUICK_REFERENCE.md](QUICK_REFERENCE.md).
