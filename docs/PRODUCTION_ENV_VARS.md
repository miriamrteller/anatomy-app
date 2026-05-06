# Production Environment Variables - Railway & Vercel

## Required Variables for FMA Integration

Add these to **Railway** and **Vercel** environment variables:

### BioPortal FMA API

```
BioPortal_API_KEY=650bca74-664a-478e-9b26-dbf79bc64bb5
BioPortal_API_URL=https://data.bioontology.org/ontologies/FMA/classes
```

**Source:** https://bioportal.bioontology.org/account
- Already configured in your account (API key above)
- No changes needed unless key expires
- Free tier: 500 requests/day per key

### SPARQL Endpoint (Fallback)

```
SPARQL_ENDPOINT=https://purl.obolibrary.org/obo/fma.owl
```

**Source:** OBO Foundry (open source, always free)
- No authentication needed
- Unlimited requests
- Activated automatically when BioPortal is rate-limited
- No configuration changes needed

---

## How to Set in Railway

1. Go to your Railway project
2. Click your deployment
3. **Variables** tab
4. Add three new variables:
   ```
   BioPortal_API_KEY = 650bca74-664a-478e-9b26-dbf79bc64bb5
   BioPortal_API_URL = https://data.bioontology.org/ontologies/FMA/classes
   SPARQL_ENDPOINT = https://purl.obolibrary.org/obo/fma.owl
   ```
5. Redeploy

---

## How to Set in Vercel

1. Go to your Vercel project
2. **Settings** → **Environment Variables**
3. Add three new variables (select "Production"):
   ```
   BioPortal_API_KEY = 650bca74-664a-478e-9b26-dbf79bc64bb5
   BioPortal_API_URL = https://data.bioontology.org/ontologies/FMA/classes
   SPARQL_ENDPOINT = https://purl.obolibrary.org/obo/fma.owl
   ```
4. Redeploy (or trigger new build)

---

## Complete Environment Variables List

For reference, here's the complete list of all required variables:

### Database (Railway)
```
DATABASE_URL=postgresql://user:password@host:port/dbname
```

### Server
```
NODE_ENV=production
PORT=3000
```

### OpenAI
```
OPENAI_API_KEY=sk-proj-...your-key...
```

### FMA Integration (NEW)
```
BioPortal_API_KEY=650bca74-664a-478e-9b26-dbf79bc64bb5
BioPortal_API_URL=https://data.bioontology.org/ontologies/FMA/classes
SPARQL_ENDPOINT=https://purl.obolibrary.org/obo/fma.owl
```

### Optional (for monitoring)
```
RAILWAY_TOKEN=...
VERCEL_TOKEN=...
PUBLIC_RAILWAY_URL=https://your-app.railway.app
```

---

## Testing Production Variables

After deploying, test the FMA integration:

### Via curl
```bash
curl -X POST https://your-app-url/api/chat \
  -H "Content-Type: application/json" \
  -d '{"question": "Tell me about the femur"}'
```

### Check logs for FMA activity
```
[FMA] Searching for: "Femur"
[FMA] Rate limit remaining: 499
[Chat] Enriched "Femur (Right)" from BIOPORTAL
```

### Verify fallback (after 490+ queries)
```
[FMA] Rate limit approaching. Switching to SPARQL. Reset at 2026-05-04T18:30:00Z
[FMA] BioPortal unavailable or rate-limited, using SPARQL
```

---

## Monitoring

### Check API Key Validity

The app automatically validates on startup. Watch for:

```
✅ BioPortal API key configured
✅ SPARQL endpoint configured
```

Or errors:
```
⚠️ BioPortal API key not configured
⚠️ SPARQL endpoint not configured
```

### Track Rate Limit in Production

The FMA client logs remaining quota:
```
[FMA] Rate limit remaining: 487
```

Daily reset is at **18:30 UTC** (based on BioPortal).

---

## Troubleshooting

### "BioPortal API key not configured" error

**Problem:** Variable not set in Railway/Vercel
**Solution:**
1. Double-check variable name (case-sensitive): `BioPortal_API_KEY`
2. Verify value: `650bca74-664a-478e-9b26-dbf79bc64bb5`
3. Redeploy after adding

### "Rate limit exceeded" errors after 500 queries

**Problem:** Daily quota exhausted (expected)
**Solution:**
- Automatic fallback to SPARQL (unlimited) kicks in
- No action needed
- Check logs: `Rate limit approaching. Switching to SPARQL`

### Slow FMA responses in production

**Problem:** SPARQL endpoint takes 500-1000ms
**Solution:**
- Add Redis caching for frequently queried structures
- Or: Pre-fetch common structures during startup
- See `docs/FMA_INTEGRATION.md` for caching options

---

## Security Notes

### API Key Exposure

Your BioPortal API key is:
```
650bca74-664a-478e-9b26-dbf79bc64bb5
```

This is a **free tier key** with 500 queries/day limit, so exposure is low-risk.

**If compromised:**
1. Go to https://bioportal.bioontology.org/account
2. Regenerate API key
3. Update in Railway/Vercel
4. Redeploy

### SPARQL Endpoint

No authentication needed (open service). Safe to hardcode.

---

## Cost Summary

| Source | Cost | Limit | Per Day |
|--------|------|-------|---------|
| BioPortal | Free | 500/day | $0 |
| SPARQL | Free | Unlimited | $0 |
| **Total** | **Free** | **Auto-scales** | **$0** |

No additional costs for production deployment.

---

## Verifying It Works

Once deployed, check that FMA enrichment is working:

```bash
# Ask about a bone
curl -X POST https://your-app/api/chat \
  -H "Content-Type: application/json" \
  -d '{"question": "What is the tibia?"}'

# Look for FMA enrichment in response
# Should include: "Official Anatomical Sources (FMA)" section
```

Expected enrichment in response:
```
## Official Anatomical Sources (FMA - Foundational Model of Anatomy)

**Tibia**
- Definition: The larger of the two bones...
- Relationships: Is a type of: Long bone; Part of: Lower limb

[Source: BioPortal FMA API (499 requests remaining)]
```

---

## Deployment Checklist

- [ ] Added `BioPortal_API_KEY` to Railway
- [ ] Added `BioPortal_API_URL` to Railway
- [ ] Added `SPARQL_ENDPOINT` to Railway
- [ ] Added same three variables to Vercel
- [ ] Redeployed Railway
- [ ] Redeployed Vercel
- [ ] Tested with curl/API call
- [ ] Verified logs show FMA enrichment
- [ ] Confirmed rate limit tracking works
