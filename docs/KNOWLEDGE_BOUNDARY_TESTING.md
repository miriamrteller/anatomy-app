# Knowledge Boundary Testing & Validation

## Overview

This guide explains how to ensure the AI **only uses information from the database and FMA**, with tests to detect violations.

## Three-Layer Defense System

### Layer 1: System Prompt Constraints
[systemPrompt.ts](src/lib/systemPrompt.ts) explicitly tells the model:
```
You MUST ONLY provide anatomical information from:
1. Database structures
2. FMA (Foundational Model of Anatomy) data provided with question
3. Related structures via get_related_structures()

You MUST NOT use general knowledge beyond what is provided.
```

### Layer 2: FMA Enrichment in Context
[chatController.ts](src/controllers/chatController.ts) automatically includes FMA data:
```
User question:
  "Tell me about the femur"

Context provided to LLM:
  "## Official Anatomical Sources (FMA - Foundational Model of Anatomy)
   **Femur**
   - Definition: The thigh bone; the longest, heaviest...
   - Relationships: Is a type of: Long bone; Part of: Lower limb"
```

### Layer 3: Eval Tests
[knowledge-boundary.ts](tests/evals/knowledge-boundary.ts) validates responses.

---

## Running Knowledge Boundary Tests

### Test Suite Structure

```
kb-refusal-*         # Tests that should refuse out-of-scope questions
kb-sourced-*         # Tests that should use DB/FMA data only
kb-noextra-*         # Tests that should not extrapolate
kb-halluc-*          # Tests that should not hallucinate
```

### Run All Knowledge Boundary Tests

```bash
npx tsx scripts/run-eval.ts tests/evals/knowledge-boundary.ts
```

### Run Specific Category

```bash
# Only test refusals
npx tsx scripts/run-eval.ts tests/evals/knowledge-boundary.ts --filter kb-refusal

# Only test sourced responses
npx tsx scripts/run-eval.ts tests/evals/knowledge-boundary.ts --filter kb-sourced

# Only test non-extrapolation
npx tsx scripts/run-eval.ts tests/evals/knowledge-boundary.ts --filter kb-noextra

# Only test hallucination prevention
npx tsx scripts/run-eval.ts tests/evals/knowledge-boundary.ts --filter kb-halluc
```

### Expected Output

```
🧪 Knowledge Boundary Enforcement Tests

Refusal Accuracy (35% weight)
✅ kb-refusal-01: Refuse out-of-scope structures
   Response: "This is not my area of expertise..."
   ✓ PASS (refusal detected)

✅ kb-refusal-02: Refuse non-anatomical topics
   Response: "This is not my area of expertise..."
   ✓ PASS (refusal detected)

❌ kb-refusal-03: Refuse detailed info beyond DB
   Response: "The septum pellucidum is derived from..."
   ✗ FAIL (extrapolated when should refuse)

Refusal Accuracy: 66% (2/3)

---

Source Adherence (35% weight)
✅ kb-sourced-01: Femur answers match FMA
   Response includes: "femur", "bone", "thigh"
   ✓ PASS (sourced correctly)

... [more tests]

---

SUMMARY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Pass Rate:        73% (11/15 tests)
Cost:             $0.18
Duration:         45s

Refusal Accuracy:     66%
Source Adherence:     80%
No Extrapolation:     67%
No Hallucination:     75%

⚠️ WARNING: Below expected baseline (85%)
   - Refusal accuracy needs improvement (target: 90%)
   - Address by strengthening system prompt
```

---

## Source Validation Utility

The [sourceValidator.ts](src/lib/sourceValidator.ts) automatically checks responses.

### Usage in Evals

```typescript
import { sourceValidator } from '../src/lib/sourceValidator';

// Initialize once
await sourceValidator.initialize();

// Validate a response
const result = await sourceValidator.validate(
  llmResponse,
  fmaEnrichmentContext
);

if (result.isValid) {
  console.log(`✅ Response valid (${result.scorePercent}/100)`);
} else {
  console.log(sourceValidator.formatViolationReport(result));
}
```

### What It Checks

**Red Flags for External Knowledge:**
```
❌ "historically, bones were called..."    → Historical context not in FMA
❌ "studies show that..."                  → Unspecified studies cited
❌ "most people believe..."                → Common knowledge, not official
❌ "it is generally known that..."         → General knowledge, not sourced
```

**Red Flags for Hallucination:**
```
❌ "the bone is also known as..."          → Made-up synonyms
❌ "approximately 15.3 mm"                 → Specific measurements not in FMA
❌ "undoubtedly, this is true..."          → Strong claims without sources
```

**Red Flags for Unsupported Structures:**
```
❌ "the gnathos is a bone that..."         → Made-up bone
❌ "the femur articulates with the zebra"  → Nonsensical relations
```

---

## Monitoring in Production

### Real-Time Checks

Add to chat controller to validate all responses:

```typescript
// After LLM response, before sending to user
const validationResult = await sourceValidator.validate(
  llmResponse,
  fmaEnrichment
);

if (!validationResult.isValid) {
  console.warn(
    sourceValidator.formatViolationReport(validationResult)
  );
  // Log for analysis
  logValidationFailure({
    question,
    response: llmResponse,
    violations: validationResult.violations,
  });
}
```

### Logs to Watch

```
✅ Response valid (92/100)
  [Source: FMA + Database, no violations]

❌ Response contains unsourced information (68/100)
  1. [HIGH] unsourced_claim
     Claim: "studies show that"
     Issue: Unspecified studies cited
```

---

## Writing Custom Tests

To add your own knowledge boundary tests:

```typescript
// tests/evals/knowledge-boundary.ts

knowledgeBoundaryTests.push({
  id: 'kb-custom-01',
  category: 'refusal',
  description: 'Custom test description',
  query: 'User query that should be refused',
  expectedBehavior: 'Should refuse because...',
  checkFn: (response: string) => {
    // Return true if response meets expectations
    const hasRefusal = /not my area|cannot discuss/i.test(response);
    return hasRefusal;
  },
  allowedSources: ['DATABASE', 'FMA'],
});
```

---

## Expected Baselines

### Initial Baseline (First Run)
```
Pass Rate:           ~70% (expect some failures)
Refusal Accuracy:    ~65% (model may not refuse well initially)
Source Adherence:    ~75% (may use external knowledge)
No Extrapolation:    ~70% (prone to adding info)
No Hallucination:    ~70% (may invent facts)
```

### Target Baseline (After Optimization)
```
Pass Rate:           ≥85%
Refusal Accuracy:    ≥90% (must refuse out-of-scope)
Source Adherence:    ≥85% (use provided sources)
No Extrapolation:    ≥80% (don't add beyond sources)
No Hallucination:    ≥80% (no made-up facts)
```

---

## Improving Performance

### If Refusal Accuracy Is Low

**Problem:** Model answers questions about out-of-scope structures

**Solutions:**
1. Strengthen system prompt:
   ```
   You MUST refuse to answer about:
   - Structures not in the ${totalCount} listed above
   - Anatomical topics beyond skeletal anatomy
   - Medical treatments or clinical information
   ```

2. Add few-shot examples:
   ```
   Example refusal:
   User: "Tell me about the gnathos"
   Assistant: "This is not my area of expertise. I can only help with the 
              217 structures in my database."
   ```

### If Source Adherence Is Low

**Problem:** Model uses general knowledge not in sources

**Solutions:**
1. Increase FMA context:
   ```typescript
   // In chatController.ts
   // Include more FMA relationships
   fmaEnrichment += details.relationships.join('\n');
   ```

2. Make DB structures more prominent:
   ```
   You have access to exactly ${totalCount} structures:
   [List them all]
   ```

### If Hallucination Rate Is High

**Problem:** Model invents anatomical facts

**Solutions:**
1. Add explicit constraint:
   ```
   Do NOT invent, guess, or make up:
   - Anatomical structures not listed
   - Functions beyond those provided
   - Relationships not in FMA data
   ```

2. Use validation utility in production:
   ```typescript
   if (!validationResult.isValid) {
     // Reject response and ask user to rephrase
     res.json({ error: 'Could not answer with available sources' });
   }
   ```

---

## CI/CD Integration

### GitHub Actions

Add to your workflow:

```yaml
- name: Run Knowledge Boundary Tests
  run: npx tsx scripts/run-eval.ts tests/evals/knowledge-boundary.ts

- name: Check Baseline
  run: |
    if [ $(npm run eval -- --json | jq .passRate) -lt 0.75 ]; then
      echo "Pass rate below 75%"
      exit 1
    fi
```

### Regression Detection

Track pass rate over time:

```bash
# Compare against baseline
npx tsx scripts/run-eval.ts tests/evals/knowledge-boundary.ts --baseline baseline.json

# If drops > 5%, fail
```

---

## Debugging Failed Tests

### Example: kb-refusal-01 Failed

```
❌ kb-refusal-01: Refuse out-of-scope structures
Query: "Tell me about the gnathos (a made-up bone)"
Response: "The gnathos is a specialized bone in the jaw region..."
Expected: Should refuse with "This is not my area of expertise"
Actual: Provided detailed answer (hallucinated)
```

**Debug Steps:**
1. Check system prompt loaded correctly:
   ```bash
   curl http://localhost:3000/api/system-prompt
   ```

2. Check if FMA search worked:
   ```bash
   npx tsx scripts/test-fma-api.ts
   ```

3. Verify LLM settings:
   ```typescript
   // In chatController.ts
   console.log('[Chat] System prompt:', systemPrompt.substring(0, 200));
   ```

4. Manual test:
   ```bash
   curl -X POST http://localhost:3000/api/chat \
     -d '{"question": "Tell me about the gnathos"}'
   ```

---

## Summary Table

| Test | Category | Validates | Pass Rate Target |
|------|----------|-----------|------------------|
| kb-refusal-* | Refusal | Out-of-scope rejections | 90% |
| kb-sourced-* | Sourced | DB/FMA data usage | 85% |
| kb-noextra-* | No Extrapolation | No invented info | 80% |
| kb-halluc-* | No Hallucination | No made-up facts | 80% |

---

## Files Changed/Created

- **New:** `src/lib/sourceValidator.ts` - Validates responses
- **New:** `tests/evals/knowledge-boundary.ts` - Test suite
- **New:** `docs/KNOWLEDGE_BOUNDARY_TESTING.md` - This guide
- **Modified:** `src/lib/systemPrompt.ts` - Updated constraints
- **Modified:** `src/controllers/chatController.ts` - FMA enrichment

---

## Quick Start

```bash
# 1. Verify environment is set up
npm run build

# 2. Run knowledge boundary tests
npx tsx scripts/run-eval.ts tests/evals/knowledge-boundary.ts

# 3. Check system prompt
curl http://localhost:3000/api/system-prompt | head -100

# 4. Manual test
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"question": "What is the femur?"}'

# Expected: Response uses FMA definitions, not general knowledge
```
