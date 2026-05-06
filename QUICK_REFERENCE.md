# Quick Reference Card

## 🚀 Production Deployment (5 Minutes)

### 1. Set Environment Variables

**Railway:**
```bash
railway variable set BioPortal_API_KEY=650bca74-664a-478e-9b26-dbf79bc64bb5
railway variable set BioPortal_API_URL=https://data.bioontology.org/ontologies/FMA/classes
railway variable set SPARQL_ENDPOINT=https://purl.obolibrary.org/obo/fma.owl
railway deploy
```

**Vercel:**
1. Settings → Environment Variables
2. Add 3 variables (select "Production")
3. Trigger new deployment

### 2. Run Baseline Tests
```bash
# Start server in one terminal
npm run dev

# Run tests in another terminal
npx tsx scripts/test-knowledge-boundary.ts
```

Expected: **≥75% pass rate** (target 85%)

### 3. Deploy to Staging
```bash
git push  # Triggers automatic deployment
```

### 4. Verify
```bash
curl -X POST https://your-staging-url/api/chat \
  -H "Content-Type: application/json" \
  -d '{"question": "What is the femur?"}'

# Should include: "## Official Anatomical Sources (FMA - Foundational Model of Anatomy)"
```

---

## 🔒 Knowledge Boundary (What It Does)

### The AI Will:
✅ Use definitions from FMA (official source)  
✅ Use data from database  
✅ Refuse questions about unknown structures  
✅ Say "This is not my area of expertise..." for out-of-scope  

### The AI Will NOT:
❌ Use general anatomy knowledge  
❌ Cite studies not provided  
❌ Make up structures or facts  
❌ Extrapolate beyond provided data  

---

## 📊 Environment Variables

| Variable | Value | Where |
|----------|-------|-------|
| `BioPortal_API_KEY` | `650bca74-664a-478e-9b26-dbf79bc64bb5` | Railway + Vercel |
| `BioPortal_API_URL` | `https://data.bioontology.org/ontologies/FMA/classes` | Railway + Vercel |
| `SPARQL_ENDPOINT` | `https://purl.obolibrary.org/obo/fma.owl` | Railway + Vercel |

---

## 🧪 Testing

### Run Knowledge Boundary Tests
```bash
npm run dev

# In another terminal:
npx tsx scripts/test-knowledge-boundary.ts
```

### Expected Baseline

| Metric | Target |
|--------|--------|
| Pass Rate | ≥85% |
| Refusal Accuracy | ≥90% |
| Source Adherence | ≥85% |
| No Extrapolation | ≥80% |
| No Hallucination | ≥80% |

---

## 🔍 Monitoring

### What to Look For

**Good signs:**
```
[FMA] Searching for: "Femur"
[FMA] Rate limit remaining: 499
[Chat] Enriched "Femur (Right)" from BIOPORTAL
```

**Bad signs:**
```
❌ BioPortal_API_KEY not configured
❌ [FMA] Failed to enrich
❌ SPARQL endpoint not configured
```

### Check Status
```bash
# In production logs:
railway logs | grep "\[FMA\]"

# Or check endpoint:
curl https://your-app/api/chat -d '{"question": "What is the femur?"}'
```

---

## ⚡ Common Queries (Expected Behavior)

### ✅ "What is the femur?"
Response includes FMA definition: "The thigh bone; the longest, heaviest..."

### ✅ "Tell me about the tibia"
Response includes FMA data with relationships and location

### ❌ "Tell me about the gnathos (made-up bone)"
Response: "This is not my area of expertise. I can only help with the 217 structures..."

### ❌ "How do bones evolve?"
Response: "This is not my area of expertise. I can only discuss skeletal anatomy..."

### ❌ "What studies show about bone density?"
Response: "This is not my area of expertise..." (no made-up studies)

---

## 🛠️ Troubleshooting

| Problem | Solution |
|---------|----------|
| "BioPortal not configured" | Check env var name (case-sensitive): `BioPortal_API_KEY` |
| Tests fail (< 75%) | Run locally: `npx tsx scripts/run-eval.ts tests/evals/knowledge-boundary.ts` |
| Rate limit exceeded (normal) | Auto-fallback to SPARQL (unlimited). Watch logs. |
| Slow responses | First 10 days normal. Cache builds over time. |
| FMA API errors | Test locally: `npx tsx scripts/test-fma-api.ts` |

---

## 📂 Documentation Files

| File | Purpose |
|------|---------|
| `instructions/PRODUCTION_ENV_VARS.md` | How to set environment variables in Railway/Vercel |
| `instructions/KNOWLEDGE_BOUNDARY_TESTING.md` | Full testing & validation guide |
| `instructions/DEPLOYMENT_CHECKLIST.md` | Pre-deployment checklist |
| `instructions/FMA_INTEGRATION.md` | FMA architecture and usage |

---

## 🎯 Key Files Modified

```
✅ src/lib/systemPrompt.ts          → Updated constraints (refusal message)
✅ src/lib/fmaApi.ts                → FMA API client (new)
✅ src/lib/sourceValidator.ts       → Response validation (new)
✅ src/controllers/chatController.ts → Integrated FMA enrichment
✅ tests/evals/knowledge-boundary.ts → 15 boundary tests (new)
```

---

## 💰 Cost

**Production cost: $0**

- BioPortal: Free (500/day)
- SPARQL: Free (unlimited)
- OpenAI: Unchanged
- Database: Unchanged

---

## ✅ Pre-Deployment Checklist

- [ ] Env vars added to Railway
- [ ] Env vars added to Vercel
- [ ] Local tests pass (≥75%)
- [ ] FMA API tested: `npx tsx scripts/test-fma-api.ts`
- [ ] System prompt check: `curl localhost:3000/api/system-prompt`
- [ ] Staging deployment working
- [ ] Manual tests pass (queries above)
- [ ] Monitoring dashboard ready
- [ ] Rollback plan prepared

---

## 📞 Need Help?

1. **Env vars not set?** → See PRODUCTION_ENV_VARS.md
2. **Tests failing?** → See KNOWLEDGE_BOUNDARY_TESTING.md (Debugging section)
3. **Want to understand FMA?** → See FMA_INTEGRATION.md
4. **Deployment help?** → See DEPLOYMENT_CHECKLIST.md

---

## 🚀 Quick Start (All Commands)

```bash
# 1. Build locally
npm run build

# 2. Test FMA locally
npx tsx scripts/test-fma-api.ts

# 3. Start dev server and run knowledge boundary tests
npm run dev
# In another terminal:
npx tsx scripts/test-knowledge-boundary.ts

# 4. Start dev server
npm run dev

# 5. Test manually in another terminal
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"question": "What is the femur?"}'

# 6. Add env vars to Railway
railway variable set BioPortal_API_KEY=650bca74-664a-478e-9b26-dbf79bc64bb5
railway variable set BioPortal_API_URL=https://data.bioontology.org/ontologies/FMA/classes
railway variable set SPARQL_ENDPOINT=https://purl.obolibrary.org/obo/fma.owl

# 7. Deploy
railway deploy

# 8. Verify in production
curl -X POST https://your-app-url/api/chat \
  -H "Content-Type: application/json" \
  -d '{"question": "What is the femur?"}'
```

---

**Version:** 1.0  
**Date:** May 3, 2026  
**Status:** ✅ Ready for Production
