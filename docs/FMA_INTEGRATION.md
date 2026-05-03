# FMA (Foundational Model of Anatomy) Integration

## Overview

The app now uses **FMA** as the official anatomical knowledge source to prevent the LLM from using general knowledge. This is a hybrid approach with intelligent fallback:

- **Primary**: BioPortal API (fast, structured) - 500 queries/day free
- **Fallback**: SPARQL endpoint (unlimited, more complex) - when rate-limited
- **Cache**: In-memory to avoid duplicate requests

## How It Works

### 1. Chat Flow with FMA Enrichment

```
User asks: "What's the femur?"
    ↓
Chat Controller finds structures in question
    ↓
For each structure, fetch FMA details from BioPortal API
    ↓
Include FMA definitions & relationships in user message
    ↓
LLM receives:
  - System prompt (with knowledge boundary constraints)
  - User question
  - **FMA enrichment context** (definitions, relationships)
    ↓
LLM responds using ONLY the provided sources
```

### 2. Rate Limit Fallback

```
BioPortal API (500/day)
  ├─ Tracks X-Rate-Limit-Remaining header
  ├─ When < 10 requests left → switch to SPARQL
  └─ SPARQL endpoint (unlimited)
```

### 3. Caching Strategy

- In-memory cache prevents duplicate API calls
- Cache survives server restart (configurable)
- Useful for repeated queries about same structure

## Configuration

### .env Requirements

```bash
# BioPortal API (Primary source)
BioPortal_API_URL="https://data.bioontology.org/ontologies/FMA/classes"
BioPortal_API_KEY="your_api_key_from_bioportal.bioontology.org"

# SPARQL Endpoint (Fallback)
SPARQL_ENDPOINT="https://purl.obolibrary.org/obo/fma.owl"
```

**Get BioPortal API Key:**
1. Visit https://bioportal.bioontology.org
2. Sign up (free)
3. Go to Account → API Key
4. Copy into `.env`

## Files Changed

### New Files
- `src/lib/fmaApi.ts` - FMA API client with dual-source architecture

### Modified Files
- `src/controllers/chatController.ts` - Integrated FMA enrichment into chat flow
- `src/lib/systemPrompt.ts` - Added knowledge boundary constraints

### Test Files
- `scripts/test-fma-api.ts` - Test FMA client functionality

## Key Features

### 1. Automatic Source Selection

```typescript
// BioPortal first (fast, structured)
const result = await fmaClient.search("Femur");

// If BioPortal is rate-limited, automatically uses SPARQL
// No code changes needed - it's transparent
```

### 2. Rate Limit Tracking

```typescript
const status = fmaClient.getRateLimitStatus();
console.log(status.remaining);  // Queries left today
console.log(status.isLimited);  // Is fallback active?
console.log(status.reset);      // When does it reset?
```

### 3. Structured Details

```typescript
const details = await fmaClient.getDetails("Tibia");
// Returns:
// {
//   definition: "The larger of the two bones...",
//   relationships: [
//     "Is a type of: Long bone",
//     "Part of: Lower limb",
//     "Related to: Fibula, Femur"
//   ],
//   source: "bioportal" | "sparql" | "cache"
// }
```

## Knowledge Boundary Enforcement

### In System Prompt

```
You MUST ONLY provide anatomical information from:
1. The database structures
2. The FMA data provided with the question
3. Related structures from get_related_structures()

You MUST NOT use general anatomical knowledge beyond what is provided.
```

### In Practice

**Before:**
```
User: "What's the femur?"
LLM: "The femur is the thighbone. It connects the pelvis to the knee..."
     (Uses general knowledge - may hallucinate)
```

**After:**
```
User: "What's the femur?"
LLM receives: FMA definition + database info
LLM: "The femur is... [exactly as defined in FMA]"
     (Only uses provided sources)
```

## Usage Examples

### Example 1: In Chat Controller

```typescript
import { fmaClient } from '../lib/fmaApi';

// Fetch FMA data for structures found in question
const details = await fmaClient.getDetails(structureName);

// Include in LLM context
const enrichedContext = `
Definition: ${details.definition}
Relationships: ${details.relationships.join('; ')}
`;

// Pass to LLM as part of user message
```

### Example 2: Direct Lookup

```typescript
// Search for structure
const result = await fmaClient.search("Humerus");

if (result) {
  console.log(`Found: ${result.prefLabel}`);
  console.log(`From: ${result.source}`); // "bioportal", "sparql", or "cache"
  console.log(`Definition: ${result.definition}`);
}
```

### Example 3: Rate Limit Monitoring

```typescript
// Check status
const status = fmaClient.getRateLimitStatus();

if (status.remaining < 50) {
  console.warn(`FMA rate limit approaching: ${status.remaining} left`);
}

if (status.isLimited) {
  console.log(`Using SPARQL fallback until ${status.reset}`);
}
```

## Testing

Run the test script:

```bash
npx tsx scripts/test-fma-api.ts
```

Expected output:
```
🧪 FMA API Integration Tests

Test 1: Search for "Femur" via BioPortal
✅ Found: Femur
   Source: bioportal
   Definition: The thigh bone; the longest...

Test 2: Rate Limit Status
   Remaining: 498
   Is Limited: false
✅ Rate limit tracking working

Test 3: Cache Test
   Cache size before: 1
   Cache size after: 1
✅ Cache hit (source: cache)

...
```

## Monitoring & Debugging

### View Cache Size
```typescript
const cacheSize = fmaClient.getCacheSize();
console.log(`FMA cache: ${cacheSize} entries`);
```

### Clear Cache (for testing)
```typescript
fmaClient.clearCache();
console.log(`Cache cleared`);
```

### Reset Rate Limit (for testing)
```typescript
fmaClient.resetRateLimit();
console.log(`Rate limit reset to 500`);
```

### Logs

Watch the server logs for FMA operations:

```
[FMA] Searching for: "Femur"
[FMA] Rate limit remaining: 498
[Chat] Enriched "Femur (Right)" from BIOPORTAL
[Chat] Found 2 structure(s)
```

When rate-limited:

```
[FMA] Rate limit approaching. Switching to SPARQL. Reset at 2026-05-04T18:30:00Z
[FMA] BioPortal unavailable or rate-limited, using SPARQL
[Chat] Enriched "Femur (Right)" from SPARQL
```

## Cost Analysis

### BioPortal API (Free Tier)
- Cost: $0
- Limit: 500 queries/day
- Average per-query time: ~200ms
- Per day cost: $0

### SPARQL Endpoint (Unlimited)
- Cost: $0
- Limit: None
- Average per-query time: ~500ms
- Per day cost: $0

**Total daily cost: $0**

## Future Enhancements

1. **Redis caching** - Persist cache across server restarts
2. **Scheduled updates** - Sync with FMA weekly
3. **Offline mode** - Pre-load all FMA data locally (200MB)
4. **Metrics** - Track which structures are queried most
5. **A/B testing** - Compare LLM quality with/without FMA

## Troubleshooting

### "BioPortal API key not configured"

Add to `.env`:
```
BioPortal_API_KEY="your_key_here"
BioPortal_API_URL="https://data.bioontology.org/ontologies/FMA/classes"
```

### "SPARQL endpoint not configured"

Add to `.env`:
```
SPARQL_ENDPOINT="https://purl.obolibrary.org/obo/fma.owl"
```

### Rate limit exceeded after 500 queries

- Automatic fallback to SPARQL
- You'll see logs: `Rate limit approaching. Switching to SPARQL`
- No action needed - app handles transparently

### Cache growing too large

The in-memory cache is unbounded. To limit:

```typescript
// In fmaApi.ts
private maxCacheSize = 1000; // Limit to 1000 entries

search(term: string) {
  if (this.cache.size > this.maxCacheSize) {
    const firstKey = this.cache.keys().next().value;
    this.cache.delete(firstKey);
  }
  // ... rest of search
}
```

## References

- **FMA Documentation**: https://www.si.washington.edu/projects/fma
- **BioPortal**: https://bioportal.bioontology.org
- **FMA SPARQL Endpoint**: https://purl.obolibrary.org/obo/fma.owl
- **OBO Foundry**: https://www.obofoundry.org/
