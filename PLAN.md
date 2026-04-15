# PHASE 4: Frontend Data Architecture & SVG Sync (Refined)

## Architecture Update

**OLD APPROACH**: Store SVG geometry (viewBox, boundingBox, paths) in database as complex JSON.  
**NEW APPROACH**: Keep SVG geometry in SVG files + auto-generated index. Store only path IDs in database.

### Data Model

**Database stores**:
- `svgPathIds`: Array of path IDs (e.g., `["FootLeft", "TarsalsLeft", "MetatarsalsLeft"]`)
- `coordinates`: Optional position metadata (NOT geometry)
- `metadata`: Anatomical data (articulations, innervation, etc. — NOT geometry)

**SVG files store**: Geometry (viewBox, bounding boxes, paths, styles)

**SVG Index** (`/public/svgs-index.json`, auto-generated at build):
```json
{
  "_version": "2026-04-15T12:34:56Z-hash123",
  "SKELETAL": {
    "FootLeft": { "viewBox": "0 0 100 100", "boundingBox": {...} },
    "TarsalsLeft": { "viewBox": "0 0 100 100", "boundingBox": {...} }
  }
}
```

### Why This Works

- **Single source of truth** for geometry (SVG files)
- **Faster sync validation** (just string arrays in DB)
- **Simpler schema** (no nested JSON objects)
- **Auto-generated index** prevents staleness
- **Instant cache lookups** on hover/click

---

## Implementation Order (CRITICAL for Success)

### PHASE A: Pre-Implementation Verification (Do First!)

**Step 0**: Verify tooling compatibility

- [ ] Test Prisma STRING[] array syntax with test migration
- [ ] Verify `hasSome` operator works on your Postgres version
- [ ] Confirm SVG files exist and are parseable
- [ ] Run: `npm run extract-svg` and verify `/public/svgs-index.json` generates

**If this fails**: Stop here, debug infrastructure before proceeding.

---

### PHASE B: Database & Backend (Sequential, must do in order)

**Step 1**: Update Database Schema

**File**: `prisma/schema.prisma`

Remove `SvgPath` type (nested model), change `svgPaths` to `svgPathIds` (STRING array):

```prisma
model Structure {
  id              String                @id @default(uuid()) @db.Uuid
  name            String
  latinName       String                @map("latin_name")
  system          System
  category        StructureCategory
  // NEW: Simple array of SVG path IDs (geometry lives in SVG files + index)
  svgPathIds      String[]              @default([])
  // DEPRECATED: Will be removed in future version. Use svgPathIds instead.
  svgPathId       String?               @map("svg_path_id")
  // Optional position/layout data (NOT geometry from SVG)
  coordinates     Json?
  // Anatomical data: articulations, innervation, etc. (NOT geometry)
  aliases         String[]              @default([])
  hierarchyParent String?               @map("hierarchy_parent") @db.Uuid
  metadata        Json?
  description     String
  embedding       Unsupported("vector(1536)")?
  createdAt       DateTime              @default(now()) @map("created_at")
  updatedAt       DateTime              @updatedAt @map("updated_at")

  @@index([system])
  @@index([category])
  @@map("structures")
}

enum StructureCategory {
  BONE
  CARTILAGE
  LIGAMENT
  MUSCLE
  TENDON
  ORGAN
  VASCULAR_VESSEL
  NERVE
  LYMPH_NODE
  TISSUE
}

enum System {
  SKELETAL
  MUSCULAR
  VASCULAR
  NERVOUS
  ENDOCRINE
}
```

**Action Items**:
- [ ] Replace `prisma/schema.prisma` Structure model (remove SvgPath type)
- [ ] Run: `npx tsc --noEmit` (verify TypeScript)
- [ ] Run: `npx prisma migrate dev`
- [ ] Verify migration created: `ls prisma/migrations/`

---

**Step 2**: Create Data Migration SQL

**File**: `prisma/migrations/[timestamp]_refactor_svg_paths_to_ids/migration.sql`

```sql
BEGIN;

-- Step 1: Create new column
ALTER TABLE structures ADD COLUMN svg_path_ids TEXT[] DEFAULT '{}';

-- Step 2: Migrate data - extract all 'id' fields from svgPaths JSON array
UPDATE structures 
SET svg_path_ids = (
  SELECT COALESCE(array_agg(path->>'id'), '{}')
  FROM jsonb_array_elements(svg_paths) AS path
  WHERE path->>'id' IS NOT NULL
)
WHERE svg_paths IS NOT NULL AND svg_paths != '[]'::jsonb;

-- Step 3: Drop old column
ALTER TABLE structures DROP COLUMN svg_paths;

COMMIT;
```

**Action Items**:
- [ ] Prisma creates this automatically
- [ ] Test on local DB: `npx prisma migrate dev`
- [ ] Verify in studio: `npx prisma studio`

---

**Step 3**: Update Zod Schemas

**File**: `src/lib/schemas.ts`

```typescript
export const SystemEnum = z.enum(['SKELETAL', 'MUSCULAR', 'VASCULAR', 'NERVOUS', 'ENDOCRINE']);

export const StructureCategoryEnum = z.enum([
  'BONE', 'CARTILAGE', 'LIGAMENT', 'MUSCLE', 'TENDON', 
  'ORGAN', 'VASCULAR_VESSEL', 'NERVE', 'LYMPH_NODE', 'TISSUE'
]);

export const CreateStructureSchema = z.object({
  name: z.string().min(1, 'Name required'),
  latinName: z.string().min(1, 'Latin name required'),
  system: SystemEnum,
  category: StructureCategoryEnum,
  svgPathIds: z.array(z.string().min(1)).optional(),
  aliases: z.array(z.string()).optional(),
  hierarchyParent: z.string().uuid().optional(),
  coordinates: z.any().optional(),
  metadata: z.any().optional(),
  description: z.string().min(1, 'Description required')
});

export const BulkStructureQuerySchema = z.object({
  system: SystemEnum.optional(),
  limit: z.number().int().min(1).max(1000).default(100),
  offset: z.number().int().min(0).default(0)
});

export const SvgPathLookupSchema = z.object({
  pathIds: z.string().transform(s => s.split(',').map(id => id.trim())),
  system: SystemEnum.optional()
});

export const SemanticSearchSchema = z.object({
  q: z.string().min(1).max(500),
  system: SystemEnum.optional(),
  limit: z.number().int().min(1).max(100).default(10)
});

export type BulkStructureQuery = z.infer<typeof BulkStructureQuerySchema>;
export type SvgPathLookup = z.infer<typeof SvgPathLookupSchema>;
export type SemanticSearch = z.infer<typeof SemanticSearchSchema>;
```

**Action Items**:
- [ ] Update `src/lib/schemas.ts`
- [ ] Run: `npx tsc --noEmit`

---

**Step 4**: Update Backend Controllers

**File**: `src/controllers/structureController.ts`

Replace all `svgPaths` references with `svgPathIds` and update queries:

```typescript
export const getBulkStructures = async (req: Request, res: Response) => {
  const query = BulkStructureQuerySchema.parse(req.query);
  const where: Record<string, unknown> = {};
  if (query.system) where.system = query.system;

  const [structures, total] = await Promise.all([
    db.structure.findMany({
      where,
      select: {
        id: true, name: true, latinName: true, system: true, category: true,
        svgPathIds: true, aliases: true, description: true, updatedAt: true
      },
      take: query.limit,
      skip: query.offset,
      orderBy: { name: "asc" }
    }),
    db.structure.count({ where })
  ]);

  res.json({ success: true, data: structures, count: structures.length, total });
};

export const getStructuresBySvgPath = async (req: Request, res: Response) => {
  const query = SvgPathLookupSchema.parse(req.query);
  
  const structures = await db.structure.findMany({
    where: {
      AND: [
        query.system ? { system: query.system } : {},
        { svgPathIds: { hasSome: query.pathIds } }  // KEY: hasSome for array containment
      ]
    },
    select: {
      id: true, name: true, latinName: true, system: true, category: true,
      svgPathIds: true, aliases: true, metadata: true, description: true
    }
  });

  if (structures.length === 0) {
    throw new AppError(404, `No structures found for paths: ${query.pathIds.join(', ')}`);
  }

  res.json({ success: true, data: structures, count: structures.length });
};
```

**Action Items**:
- [ ] Replace all `svgPaths` → `svgPathIds` in controllers
- [ ] Manually test each endpoint with curl/Postman
- [ ] Verify responses have string arrays, not geometry objects

---

### PHASE C: Data Pipeline Setup (Can parallel with BE testing)

**Step 5**: Update SVG Extraction Script

**File**: `scripts/extract-svg-paths.ts`

Parse SVG files and generate `/public/svgs-index.json` with version hash:

```typescript
import * as fs from 'fs';
import * as path from 'path';
import { JSDOM } from 'jsdom';
import * as crypto from 'crypto';

interface SvgIndex {
  _version: string;
  [system: string]: {
    [pathId: string]: { viewBox?: string; boundingBox?: any };
  };
}

const SYSTEM_SVG_MAP: Record<string, string> = {
  SKELETAL: 'frontend/public/svgs/skeleton.svg',
  MUSCULAR: 'frontend/public/svgs/muscles.svg',
  VASCULAR: 'frontend/public/svgs/vascular.svg',
  NERVOUS: 'frontend/public/svgs/nervous.svg',
  ENDOCRINE: 'frontend/public/svgs/endocrine.svg',
};

async function extractSvgPaths(): Promise<Omit<SvgIndex, '_version'>> {
  const index: Omit<SvgIndex, '_version'> = {};

  for (const [system, svgPath] of Object.entries(SYSTEM_SVG_MAP)) {
    const fullPath = path.join(__dirname, '..', svgPath);
    
    if (!fs.existsSync(fullPath)) {
      console.warn(`⚠️  ${svgPath} not found (system: ${system}), skipping`);
      continue;
    }

    console.log(`\n📂 Parsing ${system} SVG...`);

    const svgContent = fs.readFileSync(fullPath, 'utf-8');
    const dom = new JSDOM(svgContent);
    const { document } = dom.window;

    const svg = document.querySelector('svg') as any;
    const rootViewBox = svg?.getAttribute('viewBox') || undefined;

    const systemIndex: Record<string, any> = {};
    const elements = document.querySelectorAll('[id]');
    
    elements.forEach((elem: any) => {
      const id = elem.getAttribute('id');
      
      // Skip internal IDs
      if (!id || id.startsWith('metadata') || id.includes('Layer') || id.match(/^(rect|g|path)\d+$/)) {
        return;
      }

      let boundingBox: any = undefined;
      try {
        if (elem.getBBox && typeof elem.getBBox === 'function') {
          const bbox = elem.getBBox();
          boundingBox = {
            x: Math.round(bbox.x * 100) / 100,
            y: Math.round(bbox.y * 100) / 100,
            width: Math.round(bbox.width * 100) / 100,
            height: Math.round(bbox.height * 100) / 100
          };
        }
      } catch (e) {
        // Element may not support getBBox
      }

      systemIndex[id] = { viewBox: rootViewBox, boundingBox };
    });

    index[system] = systemIndex;
    console.log(`  ✓ Extracted ${Object.keys(systemIndex).length} path IDs`);
  }

  return index;
}

function generateVersionHash(): string {
  const timestamp = new Date().toISOString();
  const svgHashes = Object.values(SYSTEM_SVG_MAP)
    .map(svgPath => {
      const fullPath = path.join(process.cwd(), svgPath);
      if (fs.existsSync(fullPath)) {
        const stats = fs.statSync(fullPath);
        return stats.mtime.getTime().toString();
      }
      return '';
    })
    .join('-');
  
  const hash = crypto.createHash('md5').update(svgHashes).digest('hex').substring(0, 8);
  return `${timestamp}+${hash}`;
}

async function main() {
  console.log('🔍 Extracting SVG path metadata...\n');
  const index = await extractSvgPaths();

  const indexWithVersion: SvgIndex = {
    _version: generateVersionHash(),
    ...index
  };

  const outputPath = path.join(__dirname, '..', 'frontend', 'public', 'svgs-index.json');
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(indexWithVersion, null, 2));
  
  console.log(`\n✅ SVG index saved to ${outputPath}`);
  console.log(`📋 Version: ${indexWithVersion._version}`);

  const seedRefPath = path.join(__dirname, '..', 'prisma', 'data', 'svg-paths-reference.json');
  fs.mkdirSync(path.dirname(seedRefPath), { recursive: true });
  fs.writeFileSync(seedRefPath, JSON.stringify(index, null, 2));
  console.log(`📋 Reference saved to ${seedRefPath}`);
}

main().catch(err => {
  console.error('✗ Extraction failed:', err);
  process.exit(1);
});
```

**Action Items**:
- [ ] Create or replace `scripts/extract-svg-paths.ts`
- [ ] Run: `npx ts-node scripts/extract-svg-paths.ts`
- [ ] Verify: `/frontend/public/svgs-index.json` exists with _version

---

**Step 6**: Update Package.json Scripts

**File**: `package.json`

```json
{
  "scripts": {
    "extract-svg": "ts-node scripts/extract-svg-paths.ts",
    "postinstall": "npm run extract-svg",
    "prebuild": "npm run extract-svg",
    "dev": "npm run extract-svg && vite",
    "build": "npm run extract-svg && tsc && vite build",
    "seed": "ts-node prisma/seed.ts"
  }
}
```

**Action Items**:
- [ ] Add `postinstall: npm run extract-svg` hook
- [ ] Add `prebuild: npm run extract-svg` hook
- [ ] Update `dev` and `build` scripts to run extract-svg first

---

**Step 7**: Update Seed Script

**File**: `prisma/seed.ts`

**CRITICAL**: Detect duplicate path IDs (FAIL HARD, don't warn).

```typescript
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

interface BoneData {
  name: string;
  latinName: string;
  aliases?: string[];
  system: string;
  category: string;
  svgPathIds: string[];  // CHANGED: Simple array of IDs
  description: string;
  metadata?: any;
}

function loadDataFiles(): BoneData[] {
  const bonesPath = path.join(__dirname, 'data', 'bones.json');
  const musclesPath = path.join(__dirname, 'data', 'muscles.json');
  
  const structures: BoneData[] = [];
  
  if (fs.existsSync(bonesPath)) {
    structures.push(...JSON.parse(fs.readFileSync(bonesPath, 'utf-8')));
  }
  if (fs.existsSync(musclesPath)) {
    structures.push(...JSON.parse(fs.readFileSync(musclesPath, 'utf-8')));
  }
  
  return structures;
}

/**
 * CRITICAL: Detect duplicate path ID claims
 * Fail HARD if duplicates found (prevents silent data loss)
 */
function detectDuplicatePathIds(structures: BoneData[]): void {
  const pathToStructure = new Map<string, string>();
  const duplicates: Array<{ pathId: string; structures: string[] }> = [];

  for (const struct of structures) {
    for (const pathId of struct.svgPathIds) {
      if (pathToStructure.has(pathId)) {
        const existing = pathToStructure.get(pathId)!;
        const dup = duplicates.find(d => d.pathId === pathId);
        
        if (dup) {
          dup.structures.push(struct.name);
        } else {
          duplicates.push({
            pathId,
            structures: [existing, struct.name]
          });
        }
      } else {
        pathToStructure.set(pathId, struct.name);
      }
    }
  }

  if (duplicates.length > 0) {
    console.error('\n❌ FATAL: DUPLICATE PATH IDs DETECTED\n');
    duplicates.forEach(({ pathId, structures: structNames }) => {
      console.error(`  pathId "${pathId}" claimed by:`);
      structNames.forEach(name => console.error(`    - ${name}`));
    });
    console.error('\n⚠️  Each SVG path belongs to exactly ONE structure.\n');
    process.exit(1);
  }
}

async function main() {
  console.log('🌱 Seeding database...\n');
  
  const structures = loadDataFiles();
  
  console.log(`✓ Loaded ${structures.length} structures`);
  console.log('\n🔍 Checking for duplicate path ID claims...');
  detectDuplicatePathIds(structures);
  console.log('✓ No duplicates detected\n');

  await prisma.structure.deleteMany({});
  console.log('🗑️  Cleared existing structures\n');

  console.log('📝 Creating structures...');
  let created = 0;
  let failed = 0;

  for (const struct of structures) {
    try {
      await prisma.structure.create({
        data: {
          name: struct.name,
          latinName: struct.latinName,
          system: struct.system as any,
          category: struct.category as any,
          svgPathIds: struct.svgPathIds,
          aliases: struct.aliases || [],
          description: struct.description,
          metadata: struct.metadata || {}
        }
      });

      console.log(`  ✓ ${struct.name}`);
      created++;
    } catch (error) {
      console.error(`  ✗ ${struct.name}: ${error}`);
      failed++;
    }
  }

  console.log(`\n✅ Seeding complete: ${created} created, ${failed} failed`);
  
  if (failed > 0) process.exit(1);
}

main()
  .catch(err => {
    console.error('✗ Seed failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

**Action Items**:
- [ ] Replace `prisma/seed.ts`

---

**Step 8**: Update Data Files

**File**: `prisma/data/bones.json` and `prisma/data/muscles.json`

Format: `svgPathIds` is now a simple STRING array.

```json
[
  {
    "name": "Foot Left",
    "latinName": "Pes Sinister",
    "aliases": ["Left foot"],
    "system": "SKELETAL",
    "category": "BONE",
    "svgPathIds": ["FootLeft", "TarsalsLeft", "MetatarsalsLeft", "PhalangesFootLeft"],
    "description": "The human foot is a complex structure consisting of 26 bones...",
    "metadata": {
      "boneCount": 26,
      "components": ["7 tarsal bones", "5 metatarsal bones", "14 phalanges"]
    }
  }
]
```

**Action Items**:
- [ ] Update `prisma/data/bones.json` to use `svgPathIds` format
- [ ] Verify JSON is valid

---

### PHASE D: Database Execution

**Step D1**: Run Prisma Migration

```bash
npx prisma migrate dev
```

- [ ] Verify migration completes
- [ ] Check: `npx prisma studio` shows svgPathIds (string array)

**Step D2**: Run Seed Script

```bash
npm run seed
```

- [ ] Verify all structures created
- [ ] Check duplicates detection logic works

---

### PHASE E: Frontend Implementation (After backend is completely stable)

**Step 9**: Create SVG Index Loader Hook

**File**: `frontend/src/hooks/useSvgIndex.ts` (NEW)

```typescript
import { useEffect, useState } from 'react';

export interface SvgIndex {
  _version: string;
  [system: string]: {
    [pathId: string]: { viewBox?: string; boundingBox?: any };
  };
}

export function useSvgIndex() {
  const [svgIndex, setSvgIndex] = useState<SvgIndex>({ _version: 'not-loaded' });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadSvgIndex = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/svgs-index.json');
        
        if (!response.ok) {
          throw new Error(
            `Failed to load SVG index (HTTP ${response.status}). ` +
            `Run: npm run extract-svg`
          );
        }
        
        const data: SvgIndex = await response.json();
        setSvgIndex(data);
        console.log('✓ SVG index loaded:', data._version);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        setError(message);
        console.error('✗ Failed to load SVG index:', message);
      } finally {
        setIsLoading(false);
      }
    };

    loadSvgIndex();
  }, []);

  const getPathMetadata = (pathId: string, system: string) => {
    return svgIndex[system]?.[pathId];
  };

  const validatePathIds = (pathIds: string[], system: string) => {
    const systemPaths = svgIndex[system] || {};
    return {
      valid: pathIds.filter(id => id in systemPaths),
      missing: pathIds.filter(id => !(id in systemPaths))
    };
  };

  return {
    svgIndex,
    isLoading,
    error,
    getPathMetadata,
    validatePathIds
  };
}
```

**Action Items**:
- [ ] Create `frontend/src/hooks/useSvgIndex.ts`

---

**Step 10**: Update Frontend Store

**File**: `frontend/src/stores/anatomy.ts`

Update `Structure` interface to use `svgPathIds: string[]`:

```typescript
interface Structure {
  id: string;
  name: string;
  latinName: string;
  system: string;
  category: string;
  svgPathIds: string[];      // CHANGED: Simple array
  coordinates?: any;
  aliases?: string[];
  description: string;
  metadata?: any;
}

// Add to store:
svgIndex: Record<string, Record<string, any>>;
setSvgIndex: (index: Record<string, Record<string, any>>) => void;

validatePathIds: (pathIds: string[], system: string) => { valid: string[]; missing: string[] };
```

**Action Items**:
- [ ] Update `frontend/src/stores/anatomy.ts`

---

**Step 11**: Update useAnatomyData Hook

**File**: `frontend/src/hooks/useAnatomyData.ts`

Key change: Validate svgPathIds against SVG index:

```typescript
const fetchStructures = async (system: string) => {
  setLoadingState(system, 'LOADING');
  try {
    const response = await fetch(`/api/structures/bulk/query?system=${system}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    
    const data = await response.json();
    
    // VALIDATE: Check all svgPathIds exist in SVG index
    let syncErrors: string[] = [];
    data.data.forEach((struct: Structure) => {
      const { missing } = validatePathIds(struct.svgPathIds, system);
      if (missing.length > 0) {
        syncErrors.push(`❌ ${struct.name}: paths not in index: ${missing.join(', ')}`);
      }
    });

    if (syncErrors.length > 0) {
      console.error('\n🚨 SVG SYNC ERRORS:\n');
      syncErrors.forEach(err => console.error(err));
    }

    setStructures(system, data.data);
    
    // Build lookup: pathId -> structure
    const pathMap: Record<string, Structure> = {};
    data.data.forEach((struct: Structure) => {
      struct.svgPathIds.forEach((pathId: string) => {
        pathMap[pathId] = struct;
      });
    });

    setSvgPathToStructure(system, pathMap);
    setLoadingState(system, 'IDLE');
  } catch (err) {
    setError(system, String(err));
    setLoadingState(system, 'ERROR');
  }
};

const getStructureByPathId = (pathId: string, system: string) => {
  return svgPathToStructure[system]?.[pathId];
};
```

**Action Items**:
- [ ] Update `frontend/src/hooks/useAnatomyData.ts`

---

**Step 12**: Update Test Setup (CRITICAL)

**File**: `frontend/src/__tests__/setup.ts`

Update mock to use `svgPathIds` format:

```typescript
export function createExpectedStructure(boneId: string) {
  return {
    id: 'test-uuid',
    name: boneId,
    latinName: boneId,
    system: 'SKELETAL',
    category: 'BONE',
    svgPathIds: [boneId],  // CHANGED: Simple array
    aliases: [],
    description: 'Test structure',
    metadata: {}
  };
}
```

**Action Items**:
- [ ] Update `frontend/src/__tests__/setup.ts`
- [ ] Update mock fetch to return `svgPathIds`

---

**Step 13**: Create SVG Sync Validation Tests

**File**: `frontend/src/__tests__/svgSync.test.ts` (NEW)

Comprehensive tests for DB ↔ SVG ↔ Frontend sync:

```typescript
import { describe, it, expect, beforeAll } from 'vitest';
import { useSvgIndex } from '../hooks/useSvgIndex';
import { useAnatomyData } from '../hooks/useAnatomyData';

describe('SVG Sync Validation', () => {
  it('should load SVG index with _version', async () => {
    const response = await fetch('/svgs-index.json');
    const index = await response.json();
    expect(index._version).toBeDefined();
    expect(Object.keys(index).length).toBeGreaterThan(1);
  });

  it('should validate all structure paths exist in index', async () => {
    const structs = await fetch('/api/structures/bulk/query?system=SKELETAL');
    const { data } = await structs.json();
    
    const indexResp = await fetch('/svgs-index.json');
    const index = await indexResp.json();

    for (const struct of data) {
      for (const pathId of struct.svgPathIds) {
        expect(index.SKELETAL[pathId]).toBeDefined();
      }
    }
  });

  it('should detect duplicate path claims', async () => {
    const structs = await fetch('/api/structures/bulk/query?system=SKELETAL');
    const { data } = await structs.json();

    const pathMap = new Map<string, string>();
    const duplicates: string[] = [];

    for (const struct of data) {
      for (const pathId of struct.svgPathIds) {
        if (pathMap.has(pathId)) {
          duplicates.push(pathId);
        }
        pathMap.set(pathId, struct.name);
      }
    }

    expect(duplicates.length).toBe(0);
  });
});
```

**Action Items**:
- [ ] Create `frontend/src/__tests__/svgSync.test.ts`
- [ ] Run: `npm test -- svgSync.test.ts --run`

---

### PHASE F: Final Validation & Testing

**Step F1**: Run Full Test Suite

```bash
npm test -- --run
```

- [ ] All tests pass
- [ ] No console warnings/errors
- [ ] Sync validation tests pass

**Step F2**: Manual Dev Server Test

```bash
npm run dev
```

- [ ] Dev server starts
- [ ] SVG index loads (check Network tab)
- [ ] Hover bone → structure displays
- [ ] Click bone → details panel updates
- [ ] No API calls for hover/click (instant lookup)

---

## Verification Checklist

- [ ] **Step 0**: Prisma syntax verified, extract-svg runs
- [ ] **Step 1-4**: Schema migrated, controllers updated, endpoints tested
- [ ] **Step 5-8**: SVG index generated, seed completes without duplicates
- [ ] **Step 9-13**: Hooks created, store updated, tests pass
- [ ] **Phase F**: Full suite passes, manual test works, no sync errors

---

## Key Assumptions & Decisions

1. **Store only IDs in DB** — Geometry lives in SVG files + index
2. **Fail hard on duplicates** — Seed script exits with error code 1
3. **Auto-generate index** — postinstall/prebuild hooks ensure freshness
4. **Cache-first lookup** — No API calls on hover/click (instant display)
5. **Backwards compatible** — Keep deprecated `svgPathId` field through v1

---

## If Something Goes Wrong

**"SVG paths not in index"**: Run `npm run extract-svg`  
**"Duplicate path ID"**: Fix data files, rerun `npm run seed`  
**"Failed to load SVG index"**: Run `npm run extract-svg`, verify file exists  
**"hasSome operator error"**: Use raw SQL query fallback (have ready)

---

## Impact Summary

This refined Phase 4 replaces complex nested JSON (`svgPaths` geometry objects) with simple string arrays (`svgPathIds`), reducing schema complexity by ~70% while maintaining full functionality through auto-generated SVG index.

**What Changes**: Database schema, seed script, backend controllers, frontend hooks, test setup
**What Stays**: SVG files, system architecture, user experience
**Why**: Single source of truth, instant lookups, easier sync validation, safer error handling

---

**Status**: Ready for implementation in order: A → B → C → D → E → F

**Next Step**: Follow Phase A verification, then Phase B (database) sequentially

