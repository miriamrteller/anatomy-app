# Phase 6 Eval Success Criteria

## Overview
This document defines what constitutes "success" for the anatomy-app evaluation framework across all five dimensions: RAG accuracy, tool-calling correctness, response quality, performance, and cost tracking.

---

## 1. RAG Retrieval Accuracy

**Dimension**: Evaluates whether the RAG pipeline correctly identifies relevant anatomical structures from user queries.

### Metrics

| Metric | Target | Threshold | Notes |
|--------|--------|-----------|-------|
| **RAG Precision** | 90% | ≥85% | Of structures returned by RAG, what % are relevant to the query? |
| **RAG Recall** | 85% | ≥80% | Of structures that should be highlighted, what % did RAG find? |
| **Semantic Relevance** | 88% | ≥82% | Manual review: Are returned structures semantically related to query intent? |

### Calculation

```
RAG Precision = (Correctly Retrieved Structures) / (Total Retrieved Structures)
RAG Recall = (Correctly Retrieved Structures) / (Expected Structures in Dataset)
```

### Known Gaps (GAP-1 Handling)

The following queries have **expected degradation** because structures are not in the SVG:

| Query ID | Missing Structure(s) | Expected Behavior | Success Criteria |
|----------|-------------------|------------------|------------------|
| edge-case-001 | hyoid | RAG finds nothing; chatbot explains gracefully | Accurate description + no highlighting attempt |
| edge-case-002 | frontal bone (skull detail) | RAG returns "cranium"; chatbot explains relationship | Highlights cranium + explains frontal is part of it |
| edge-case-006 | vomer | RAG finds nothing; factual answer only | Accurate description without highlighting |
| edge-case-007 | ear ossicles (malleus, incus, stapes) | RAG finds nothing; factual answer only | Accurate description without highlighting |
| edge-case-010 | ethmoid bone | RAG finds nothing; factual answer only | Accurate description without highlighting |
| edge-case-011 | sphenoid bone | RAG finds nothing; factual answer only | Accurate description without highlighting |
| edge-case-012 | nasal bones | RAG finds nothing; factual answer only | Accurate description without highlighting |
| straightforward-014 | maxilla (fixed to highlight cranium instead) | RAG returns "cranium"; chatbot contextualizes | Highlights cranium + explains maxilla is part of it |
| straightforward-018 | sesamoid bones | RAG finds "patella"; contextualizes sesamoid bones | Highlights patella + explains sesamoids are embedded in tendons |

**Degradation is acceptable** for queries about non-visualized structures. Success is measured on **graceful failure**: providing accurate anatomical knowledge without attempting to highlight non-existent SVG elements.

### Per-Category Targets

| Category | Precision Target | Recall Target | Rationale |
|----------|-----------------|---------------|-----------|
| **straightforward** | 95% | 92% | Simple queries; should have near-perfect accuracy |
| **common-student** | 88% | 85% | Factual questions; some may not require highlighting |
| **system-specific** | 85% | 80% | Complex multi-structure queries; harder to get all |
| **edge-case** | 75% | 70% | Intentionally difficult; includes known gaps; graceful failure acceptable |
| **multi-turn** | 82% | 78% | Context matters; harder to maintain consistency across turns |

---

## 2. Tool-Calling Correctness

**Dimension**: Evaluates whether the agent correctly selects and executes the three function-calling tools.

### Tool Definitions

| Tool | Purpose | Success = |
|------|---------|-----------|
| `highlight_structures` | Mark SVG groups with visual highlighting | Called when user asks to show/identify/point out bones; uses only valid SVG IDs |
| `show_layer` | Switch anatomical system view | Called when user asks to "switch to", "show me", or "display" a specific layer |
| `get_related_structures` | Retrieve bones connected to a target | Called when user asks about what connects to, what articulates with, or related structures |

### Metrics

| Metric | Target | Threshold | Calculation |
|--------|--------|-----------|-------------|
| **Tool Precision** | 95% | ≥90% | (Correct Tool Calls) / (Total Tool Calls Made) |
| **Tool Recall** | 92% | ≥85% | (Correct Tool Calls) / (Expected Tool Calls in Dataset) |
| **Invalid SVG ID Rate** | 0% | 0% | Any call to highlight_structures with non-existent SVG ID = FAIL |
| **Tool Sequence Correctness** | 90% | ≥85% | For multi-step queries, are tools called in logical order? |

### Scoring Rules

**Tool Precision Examples:**
- ✅ User: "Show me the femur" → Agent calls `highlight_structures(["femur-left", "femur-right"])`
- ❌ User: "Show me the femur" → Agent calls `show_layer("SKELETAL")` first without highlighting
- ✅ User: "Switch to skeletal and show femur" → Agent calls `show_layer`, then `highlight_structures`
- ❌ User: "Show me a rib" → Agent calls `highlight_structures(["rib-1-left"])` (invalid SVG ID)

**Tool Recall Examples:**
- Dataset expects: `["show_layer", "highlight_structures"]`
- Agent calls: `["show_layer"]` only → Recall = 50%
- Agent calls: `["show_layer", "highlight_structures"]` → Recall = 100%

### Invalid SVG ID Failure

**Zero tolerance policy**: Any call to `highlight_structures` with an SVG ID not in [existingbones.ts](../../../frontend/public/svgs/existingbones.ts) results in:
- Tool call marked **FAILED**
- Eval for that query marked **FAILED** regardless of other metrics
- Logged separately for debugging

Valid SVG IDs (58 total):
```
foot-left, foot-right, tarsals-left, tarsals-right, metatarsals-left, metatarsals-right,
phalanges-left, phalanges-right, phalanges-f-left, phalanges-f-right,
femur-left, femur-right, fibula-left, fibula-right, tibia, tibia-left, tibia-right,
patella-left, patella-right, pelvis, pelvic-girdle, sacrum, coccyx,
lumbar-vertebrae, ribcage, thoracic-vertebrae, cervical-vertebrae,
knee-joint-left, knee-joint-right, hip-joint-left, hip-joint-right,
sternum, manubrium, skull, mandible, teeth, cranium,
scapula, scapular-left, scapula-right, clavicle-left, clavicle-right,
humerus-left, humerus-right, radius-left, radius-right, ulna-left, ulna-right,
hand-left, hand-right, carpals-left, carpals-right, metacarpals-left, metacarpals-right
```

### Per-Category Targets

| Category | Precision | Recall | Notes |
|----------|-----------|--------|-------|
| **straightforward** | 98% | 95% | Simple, obvious tool usage |
| **common-student** | 92% | 90% | Some factual questions don't need tools |
| **system-specific** | 95% | 92% | Explicitly require layer switching |
| **edge-case** | 85% | 80% | Queries about unavailable structures; graceful failure acceptable |
| **multi-turn** | 90% | 85% | Context preservation across turns harder |

---

## 3. Response Quality

**Dimension**: Evaluates the quality, accuracy, and completeness of chatbot responses.

### Metrics

| Metric | Target | Threshold | Scoring |
|--------|--------|-----------|---------|
| **Factual Accuracy** | 95% | ≥90% | Answer contains anatomically correct information |
| **Completeness** | 90% | ≥85% | Answer includes expected key details (see answerMustContain) |
| **Hallucination Rate** | 0% | ≤2% | False anatomical claims (auto-fail on hallucinations) |
| **Conciseness** | 85% | ≥80% | Answer is relevant, not over-explained (manual scoring) |

### Scoring Rules

**Factual Accuracy**:
- All key anatomical facts must be correct
- Terminology must be precise (e.g., "medial" vs "lateral", "proximal" vs "distal")
- Functional descriptions must be accurate

**Completeness**:
- Answer must contain ALL items in `answerMustContain` field (fuzzy match acceptable)
- Answer must NOT contain ANY items in `answerMustNotContain` (exact match triggers fail)
- Example: Query expects `["femur", "thigh", "longest bone"]`
  - ✅ "The femur is the longest bone in the human body, forming your thigh."
  - ❌ "The femur is a leg bone." (missing "longest" and "thigh" context)

**Hallucination Examples**:
- ❌ "The femur connects directly to the ribcage" (anatomically false)
- ❌ "We have 250 bones in the human body" (factually wrong per dataset)
- ❌ "The hyoid bone is in your leg" (false location)

**Conciseness**:
- Response should directly answer the question
- Excessive elaboration without relevance = lower score
- Context-appropriate detail is acceptable

### Per-Category Targets

| Category | Accuracy | Completeness | Notes |
|----------|----------|--------------|-------|
| **straightforward** | 98% | 95% | Simple facts, should be near-perfect |
| **common-student** | 94% | 92% | Factual knowledge questions |
| **system-specific** | 92% | 90% | Complex reasoning; some elaboration expected |
| **edge-case** | 88% | 85% | Intentionally difficult; graceful handling of gaps acceptable |
| **multi-turn** | 90% | 88% | Context-dependent; harder to maintain perfect accuracy |

### Manual Scoring Guidelines

Use **0-10 scale** with these anchors:

| Score | Quality | Example |
|-------|---------|---------|
| **9-10** | Perfect | Accurate, complete, well-explained, concise |
| **7-8** | Good | Accurate and complete, minor clarity issues |
| **5-6** | Fair | Mostly accurate, missing some details or minor errors |
| **3-4** | Poor | Some inaccuracies or significant missing details |
| **0-2** | Fail | Major errors, hallucinations, or incomplete response |

Average score ≥7.0 = Pass for response quality.

---

## 4. Performance (Latency)

**Dimension**: Evaluates the speed and responsiveness of the chatbot.

### Metrics

| Metric | SLA Target | Acceptable Range | Critical Threshold |
|--------|-----------|-----------------|-------------------|
| **Time-to-First-Token (TTFT)** | <2s | <3s | >5s = FAIL |
| **End-to-End Latency** | <8s | <12s | >20s = FAIL |
| **Token Generation Rate** | >30 tokens/sec | >20 tokens/sec | <15 tokens/sec = WARN |
| **95th Percentile Latency** | <15s | <20s | N/A |

### Calculation

```
Time-to-First-Token = (First token received) - (Request sent)
End-to-End Latency = (Final "done" event) - (Request sent)
Token Gen Rate = (Tokens generated) / (Generation time)
```

### Per-Category SLAs

| Category | TTFT Target | E2E Target | Rationale |
|----------|------------|-----------|-----------|
| **straightforward** | <1.5s | <6s | Simple queries, quick RAG + response |
| **common-student** | <2s | <8s | Factual knowledge lookup |
| **system-specific** | <2.5s | <10s | Includes layer switching + complex highlighting |
| **edge-case** | <2.5s | <12s | May require degraded path handling |
| **multi-turn** | <2s | <10s | Context already in memory, faster response |

### Acceptable Failures

- 1-2 queries per 80 may exceed SLA due to OpenAI API latency
- Network issues documented separately
- Degradation patterns logged for cost analysis

### Monitoring

Record for each query:
- `ttft_ms`: Time to first token
- `total_latency_ms`: Full response time
- `token_count`: Tokens generated
- `streaming_chunks`: Number of SSE events
- `api_calls`: Number of OpenAI API calls

---

## 5. Cost Tracking

**Dimension**: Measures OpenAI API costs and ensures cost-efficiency.

### Metrics

| Metric | Target | Acceptable Range | Alert Threshold |
|--------|--------|------------------|-----------------|
| **Cost Per Query** | $0.015 | <$0.025 | >$0.05 = ALERT |
| **Average Cost (80 queries)** | $1.20 | <$2.00 | >$2.50 = FAIL |
| **Cost per Token (input)** | $0.0002 | $0.00015-$0.0003 | N/A |
| **Cost per Token (output)** | $0.0006 | $0.0004-$0.001 | N/A |

### OpenAI Pricing (As of April 2026)

**GPT-4o** (current model):
- Input: $5 / 1M tokens = $0.000005 per token
- Output: $15 / 1M tokens = $0.000015 per token

**Calculation Example**:
- Query: 200 input tokens, 150 output tokens
- Cost = (200 × $0.000005) + (150 × $0.000015) = $0.001 + $0.00225 = **$0.00325**

### Cost Per Category

| Category | Queries | Avg Tokens (in/out) | Est. Cost | Per-Query Cost |
|----------|---------|-------------------|-----------|----------------|
| **straightforward** | 20 | 100/80 | $0.27 | $0.0135 |
| **common-student** | 15 | 120/100 | $0.32 | $0.0213 |
| **system-specific** | 15 | 180/140 | $0.59 | $0.0393 |
| **edge-case** | 15 | 150/120 | $0.49 | $0.0327 |
| **multi-turn** | 10 (20 queries, 2 per sequence) | 140/110 | $0.40 | $0.0200 |
| **TOTAL** | 80 | ~130/105 | **$2.07** | **$0.0259** |

### Cost Anomalies

Alert on:
- Single query costing >$0.05 (likely many retries or long responses)
- Category average >20% above estimated
- Cumulative cost >$2.50 for 80 queries

### Cost Optimization Strategies

If cost exceeds budget:
1. **Reduce context window** in tool handler prompts
2. **Cache system prompt** using OpenAI cache feature (if available)
3. **Batch similar queries** to reuse embeddings
4. **Switch to GPT-4 Turbo** if cost-benefit allows (cheaper output)

---

## 6. Overall Eval Result Classification

### Passing Eval (All Dimensions)

A single query **PASSES** evaluation if:
- ✅ RAG: Precision ≥ category target OR gracefully handles unknown structures
- ✅ Tool Calling: Tool calls are correct with zero invalid SVG IDs
- ✅ Response Quality: Manually scored ≥7.0 (or auto-pass on completeness checks)
- ✅ Latency: Within SLA for category (or documented as external delay)
- ✅ Cost: Tracked for reporting (no hard fail, but alert if >$0.05)

### Failing Eval

A query **FAILS** evaluation if any of:
- ❌ Invalid SVG ID in `highlight_structures` call
- ❌ Major hallucination (anatomically false claim)
- ❌ Missing ALL required answerMustContain items
- ❌ Contains ANY answerMustNotContain item
- ❌ Latency >2x category SLA (e.g., >20s for straightforward)

### Dataset Pass Rates

| Target | Definition | Success Threshold |
|--------|-----------|------------------|
| **Strict** | All 5 dimensions ≥target | ≥75% of 80 queries |
| **Good** | ≥4 dimensions ≥target | ≥85% of 80 queries |
| **Acceptable** | ≥3 dimensions ≥target | ≥90% of 80 queries |
| **Baseline** | ≥2 dimensions ≥target | ≥95% of 80 queries |

**Phase 6 Success Criteria: Achieve "Acceptable" pass rate (≥90% queries with ≥3/5 dimensions passing)**

---

## 7. Reporting & Interpretation

### Output Metrics

For each eval run, generate:

1. **Aggregate Report**
   - Overall pass rate by category
   - Dimension pass rates (RAG, Tool, Quality, Latency, Cost)
   - Top 5 failures by dimension

2. **Per-Query Detail** (JSON)
   ```json
   {
     "query_id": "straightforward-001",
     "category": "straightforward",
     "query": "Where is the femur?",
     "results": {
       "rag_precision": 1.0,
       "rag_recall": 1.0,
       "tool_precision": 1.0,
       "tool_calls": ["highlight_structures"],
       "invalid_svg_ids": [],
       "response_quality_score": 9,
       "ttft_ms": 1200,
       "total_latency_ms": 5800,
       "token_count": 145,
       "cost_usd": 0.00389,
       "status": "PASS"
     }
   }
   ```

3. **Failure Analysis**
   - Group failures by root cause
   - Separate "graceful failures" (known gaps) from unexpected failures
   - Identify systematic issues (e.g., all "atlas/axis" queries fail)

### Known Limitations & Caveats

1. **GPT-4o Variability**: Model outputs vary; same query may have different latency/cost on different days
2. **RAG Precision**: Subjective assessment; defined by dataset schema but requires human validation on first run
3. **Manual Scoring**: Response quality requires human review; establish rubric consistency before scaling
4. **External Delays**: OpenAI API latency not under our control; document separately if spike observed
5. **Context Carryover**: Multi-turn queries depend on message history; may not be reproducible without session replay

### Baseline Establishment

**First eval run is diagnostic, not judgmental**:
- Measure actual performance across all dimensions
- Identify quick wins (tool calling bugs, prompt issues)
- Set realistic thresholds based on observed distribution
- Document cost baseline for future regression detection

**Do not reject Phase 7 implementation based on first-run results**. Use baselines to:
- Set performance targets for future iterations
- Prioritize optimization efforts
- Understand cost/quality tradeoff

---

## 8. Regression Detection

### Quarterly Eval Runs

After Phase 6 baseline is established, run eval suite quarterly to detect:

| Metric | Regression Threshold | Action |
|--------|---------------------|--------|
| Overall pass rate drops >10% | Yes | Review changes, prioritize fixes |
| Any dimension drops >15% | Yes | Deep dive into that dimension |
| Cost per query increases >30% | Yes | Profile API calls, optimize prompts |
| 95th percentile latency >25s | Yes | Check OpenAI status, optimize streaming |

### Root Cause Analysis

For any regression:
1. Compare baseline snapshot vs current
2. Identify code/data changes
3. Reproduce failure in isolation
4. Document fix in release notes

---

## Appendix: GAP-1 Known Gaps Reference

[See GAP-1-DECISION-MATRIX.md](../../../GAP-1-DECISION-MATRIX.md) for complete list of 9 missing bones and rationale.

**Bones NOT in SVG (Non-highlightable)**:
- Hyoid (floating bone in neck)
- Individual skull bones (frontal, ethmoid, sphenoid, vomer, nasal, etc.)
- Individual ear ossicles (malleus, incus, stapes)
- All others are included in grouped structures (ribcage, pelvis, tarsals, vertebrae, etc.)

**Queries About These Structures**: Expected to fail RAG retrieval but pass if response is factually accurate and chatbot gracefully explains limitation.
