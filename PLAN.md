# Architecture: SVG-to-Database Mapping for Anatomy App

## Overview

This document outlines the planned architecture for connecting backend anatomical data with frontend SVG rendering, enabling scalable multi-system visualization (bones, muscles, organs, vascular, nervous) with AI integration capabilities.

---

## Current State Analysis

### Backend
- Single `structures` table with ~11 seeded skeletal structures
- Field: `svgPathId` (string, optional, single SVG reference)
- Supports 5 anatomical systems via enum: SKELETAL, MUSCULAR, VASCULAR, NERVOUS, ENDOCRINE
- Two read-only endpoints: `GET /structures`, `GET /structures/:id`
- pgvector extension ready for semantic search
- Zod validation schemas prepared but not fully utilized

### Frontend
- Renders only `skeleton.svg` (other 4 system SVGs missing)
- SVG paths require `id` attributes for interactivity
- State stored in Zustand: `selectedStructure`, `hoveredStructure`, `visibleSystems`, `highlightedIds`
- Fetches structure data on hover/click via `GET /api/structures?svg_path_id={id}` (N+1 problem)
- No preloading or caching

### SVG Structure
- skeleton.svg contains ~100+ path elements with mixed IDs:
  - High-level: `FootLeft`, `Skull`, `Manubrium`
  - Fine-grained: `TarsalsLeft`, `MetatarsalsLeft`, `PhalangesFootLeft` (all part of foot)
- bone-ids.txt lists 23 canonical bone names (high-level)

### Core Problem
- **One DB record per structure** (FootLeft) but **multiple SVG path elements** (TarsalsLeft, MetatarsalsLeft, PhalangesFootLeft, etc.)
- No centralized mapping between SVG IDs and DB records
- FE doesn't know which SVG paths belong to which anatomical structure
- No preloading → slow interaction experience

---

## Solution Architecture

**KEY DECISION:** One DB record per anatomical structure (bone/muscle), with an array of SVG path IDs per record.

**Example:**
```json
{
  "id": "uuid-123",
  "name": "Foot Left",
  "latinName": "Pes Sinister",
  "system": "SKELETAL",
  "category": "BONE",
  "svgPaths": [
    { "id": "FootLeft", "viewBox": "...", "boundingBox": {...} },
    { "id": "TarsalsLeft", "viewBox": "...", "boundingBox": {...} },
    { "id": "MetatarsalsLeft", "viewBox": "...", "boundingBox": {...} },
    { "id": "PhalangesFootLeft", "viewBox": "...", "boundingBox": {...} }
  ],
  "coordinates": { "x": 0, "y": 500, "width": 50, "height": 100 },
  "description": "...",
  "metadata": { "articulations": [...], "innervation": [...] },
  "embedding": [0.1, 0.2, ...],  // 1536-dimensional vector
  "createdAt": "2026-04-14T00:00:00Z",
  "updatedAt": "2026-04-14T00:00:00Z"
}
```

**FE Interaction Flow:**
1. App init: `useAnatomyData` fetches all structures for visible system(s) → cached in Zustand
2. SVG hover/click: lookup structure from cache using SVG path ID → instant display (no API call)
3. System toggle: refetch only toggled system, merge with cache

---

## Implementation Phases

### PHASE 1: Database Schema & Migration

**Goal:** Extend Prisma schema to support multiple SVG paths per structure and additional metadata.

**Files to Modify:**
- `prisma/schema.prisma`
- `src/lib/schemas.ts`

**Step 1.1: Update Prisma Schema**

Open `prisma/schema.prisma` and modify the `Structure` model. Current model:
```prisma
model Structure {
  id          String   @id @default(cuid())
  name        String
  latinName   String
  system      System
  coordinates Json?
  svgPathId   String?
  description String
  embedding   Unsupported("vector(1536)")?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([svgPathId])
  @@index([system])
}
```

Replace with:
```prisma
model Structure {
  id              String                @id @default(cuid())
  name            String
  latinName       String
  system          System
  category        StructureCategory     // NEW: BONE, MUSCLE, ORGAN, VASCULAR_VESSEL, NERVE
  svgPaths        SvgPath[]             // NEW: Array of SVG references
  coordinates     Json?
  svgPathId       String?               // DEPRECATED: kept for backwards compatibility during transition
  aliases         String[]              // NEW: Synonyms and common names
  hierarchyParent String?               // NEW: UUID of parent structure (for future nesting)
  metadata        Json?                 // NEW: Articulations, innervation, blood supply, insertion points
  description     String
  embedding       Unsupported("vector(1536)")?
  createdAt       DateTime              @default(now())
  updatedAt       DateTime              @updatedAt

  @@index([svgPathId])
  @@index([system])
  @@index([category])
}

// NEW: Nested model for SVG path metadata
type SvgPath {
  id         String    // SVG element ID (e.g., "TarsalsLeft")
  viewBox    String?   // SVG viewBox attribute if available
  x          Float?    // Bounding box top-left X
  y          Float?    // Bounding box top-left Y
  width      Float?    // Bounding box width
  height     Float?    // Bounding box height
  boundingBox Json?    // Additional visual metadata
  system     String?   // System this path belongs to (SKELETAL, MUSCULAR, etc.)
}

// NEW: Enum for granular structure categorization
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
```

**Action Items:**
- [ ] Edit `prisma/schema.prisma`: add `StructureCategory` enum at top
- [ ] Edit `prisma/schema.prisma`: add `SvgPath` type
- [ ] Edit `prisma/schema.prisma`: update `Structure` model with new fields
- [ ] Run `npx prisma migrate dev --name add_svg_paths_and_metadata`
- [ ] Verify migration succeeds: `npx prisma studio` should show new fields

**Step 1.2: Update Zod Validation Schemas**

Open `src/lib/schemas.ts` and add new schemas for validation. Current file likely has:
```typescript
export const SystemEnum = z.enum(['SKELETAL', 'MUSCULAR', 'VASCULAR', 'NERVOUS', 'ENDOCRINE']);
export const StructureParamSchema = z.object({ id: z.string().uuid() });
export const CreateStructureSchema = z.object({ ... });
```

Add after existing schemas:
```typescript
// NEW enums
export const StructureCategoryEnum = z.enum([
  'BONE',
  'CARTILAGE',
  'LIGAMENT',
  'MUSCLE',
  'TENDON',
  'ORGAN',
  'VASCULAR_VESSEL',
  'NERVE',
  'LYMPH_NODE',
  'TISSUE'
]);

// NEW: SvgPath object schema
export const SvgPathSchema = z.object({
  id: z.string().min(1, 'SVG path ID required'),
  viewBox: z.string().optional(),
  x: z.number().optional(),
  y: z.number().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
  boundingBox: z.any().optional(),
  system: SystemEnum.optional()
});

// NEW: Updated CreateStructureSchema with new fields
export const CreateStructureSchema = z.object({
  name: z.string().min(1, 'Name required'),
  latinName: z.string().min(1, 'Latin name required'),
  system: SystemEnum,
  category: StructureCategoryEnum,
  svgPaths: z.array(SvgPathSchema),
  aliases: z.array(z.string()).optional(),
  hierarchyParent: z.string().uuid().optional(),
  metadata: z.any().optional(),
  coordinates: z.any().optional(),
  description: z.string().min(1, 'Description required'),
  svgPathId: z.string().optional() // deprecated but kept
});

// NEW: Query schema for bulk fetch
export const BulkStructureQuerySchema = z.object({
  system: SystemEnum.optional(),
  limit: z.number().int().min(1).max(1000).default(100),
  offset: z.number().int().min(0).default(0)
});

// NEW: Query schema for SVG path lookup
export const SvgPathLookupSchema = z.object({
  pathIds: z.string().transform(s => s.split(',').map(id => id.trim())), // comma-separated
  system: SystemEnum.optional()
});

// NEW: Query schema for semantic search
export const SemanticSearchSchema = z.object({
  q: z.string().min(1, 'Search query required').max(500),
  system: SystemEnum.optional(),
  limit: z.number().int().min(1).max(100).default(10)
});

export type Structure = z.infer<typeof CreateStructureSchema>;
export type SvgPath = z.infer<typeof SvgPathSchema>;
export type BulkStructureQuery = z.infer<typeof BulkStructureQuerySchema>;
export type SvgPathLookup = z.infer<typeof SvgPathLookupSchema>;
export type SemanticSearch = z.infer<typeof SemanticSearchSchema>;
```

**Action Items:**
- [ ] Edit `src/lib/schemas.ts`: add new enums and schemas
- [ ] Verify TypeScript compilation: `npx tsc --noEmit`

---

### PHASE 2: Seed Data & Real Anatomical Data

**Goal:** Create comprehensive seed scripts to populate database with real anatomical data (206 bones, 600+ muscles) with embeddings and SVG path mappings.

**Files to Create/Modify:**
- `prisma/seed.ts` (rewrite)
- `prisma/data/bones.json` (create)
- `prisma/data/muscles.json` (create)
- `scripts/extract-svg-paths.ts` (create)
- `scripts/label-svg-paths.ts` (create, optional)

**Step 2.1: Create SVG Path Extraction Utility**

Create `scripts/extract-svg-paths.ts` — parses skeleton.svg and other system SVGs to extract all meaningful path IDs and bounding boxes.

```typescript
// scripts/extract-svg-paths.ts
import * as fs from 'fs';
import * as path from 'path';
import { JSDOM } from 'jsdom';

interface ExtractedPath {
  id: string;
  system: string; // 'SKELETAL', 'MUSCULAR', etc.
  viewBox?: string;
  boundingBox?: { x: number; y: number; width: number; height: number };
}

const SYSTEM_SVG_MAP = {
  SKELETAL: 'frontend/public/svgs/skeleton.svg',
  MUSCULAR: 'frontend/public/svgs/muscles.svg',
  VASCULAR: 'frontend/public/svgs/vascular.svg',
  NERVOUS: 'frontend/public/svgs/nervous.svg',
  ENDOCRINE: 'frontend/public/svgs/endocrine.svg',
};

async function extractSvgPaths(): Promise<ExtractedPath[]> {
  const allPaths: ExtractedPath[] = [];

  for (const [system, svgPath] of Object.entries(SYSTEM_SVG_MAP)) {
    const fullPath = path.join(__dirname, '..', svgPath);
    
    // Skip if SVG doesn't exist yet
    if (!fs.existsSync(fullPath)) {
      console.warn(`⚠️  ${svgPath} not found (system: ${system}), skipping`);
      continue;
    }

    const svgContent = fs.readFileSync(fullPath, 'utf-8');
    const dom = new JSDOM(svgContent);
    const { document } = dom.window;

    // Extract viewBox from root SVG
    const svg = document.querySelector('svg');
    const viewBox = svg?.getAttribute('viewBox') || undefined;

    // Extract all paths with IDs and groups with IDs
    const elements = document.querySelectorAll('[id]');
    
    elements.forEach((elem) => {
      const id = elem.getAttribute('id');
      
      // Skip Inkscape/Adobe internal IDs (layer names, metadata, etc.)
      if (!id || id.startsWith('metadata') || id.startsWith('defs') || 
          id.includes('Layer') || id.match(/^(rect|g|path)\d+$/)) {
        return;
      }

      // Extract bounding box
      let boundingBox: { x: number; y: number; width: number; height: number } | undefined;
      if (elem instanceof dom.window.SVGGraphicsElement) {
        try {
          const bbox = elem.getBBox();
          boundingBox = {
            x: bbox.x,
            y: bbox.y,
            width: bbox.width,
            height: bbox.height
          };
        } catch (e) {
          // Element may not support getBBox
        }
      }

      allPaths.push({
        id,
        system,
        viewBox,
        boundingBox
      });
    });
  }

  return allPaths;
}

async function main() {
  console.log('🔍 Extracting SVG paths...');
  const paths = await extractSvgPaths();
  
  // Group by system
  const pathsBySystem = paths.reduce((acc, p) => {
    if (!acc[p.system]) acc[p.system] = [];
    acc[p.system].push(p);
    return acc;
  }, {} as Record<string, ExtractedPath[]>);

  // Output report
  Object.entries(pathsBySystem).forEach(([system, systemPaths]) => {
    console.log(`\n${system}: ${systemPaths.length} paths`);
    systemPaths.slice(0, 10).forEach(p => console.log(`  - ${p.id}`));
    if (systemPaths.length > 10) console.log(`  ... and ${systemPaths.length - 10} more`);
  });

  // Save to file for seed script to use
  const outputPath = path.join(__dirname, '..', 'prisma', 'data', 'svg-paths-inventory.json');
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(pathsBySystem, null, 2));
  
  console.log(`\n✅ SVG path inventory saved to ${outputPath}`);
}

main().catch(console.error);
```

**Action Items:**
- [ ] Create `scripts/extract-svg-paths.ts` with code above
- [ ] Run: `npx ts-node scripts/extract-svg-paths.ts` to generate `prisma/data/svg-paths-inventory.json`
- [ ] Examine inventory JSON to understand SVG structure
- [ ] Add `"extract-svg": "ts-node scripts/extract-svg-paths.ts"` to package.json scripts

**Step 2.2: Create Bone Data File**

Create `prisma/data/bones.json` — comprehensive list of 206 human bones with metadata.

```json
[
  {
    "name": "Femur",
    "latinName": "Femur",
    "aliases": ["Thigh bone", "Thighbone"],
    "system": "SKELETAL",
    "category": "BONE",
    "svgPathIds": { "SKELETAL": ["FemurLeft", "FemurRight"] },
    "description": "The femur is the longest, heaviest, and strongest bone of the human skeleton. It extends from the pelvis to the knee.",
    "metadata": {
      "articulations": ["Pelvis (hip joint)", "Tibia (knee joint)"],
      "innervation": "Femoral nerve, sciatic nerve",
      "bloodSupply": "Femoral artery, profunda femoris artery",
      "insertions": {
        "proximal": ["Hip joint capsule"],
        "distal": ["Knee joint capsule"]
      }
    }
  },
  {
    "name": "Tibia",
    "latinName": "Tibia",
    "aliases": ["Shin bone", "Shinbone"],
    "system": "SKELETAL",
    "category": "BONE",
    "svgPathIds": { "SKELETAL": ["TibiaLeft", "TibiaRight"] },
    "description": "The tibia, commonly known as the shin bone, is the larger and stronger of the two bones in the lower leg, located on the medial side.",
    "metadata": {
      "articulations": ["Femur (knee joint)", "Fibula (tibiofibular joint)", "Talus (ankle joint)"],
      "innervation": "Tibial nerve, saphenous nerve",
      "bloodSupply": "Anterior tibial artery, posterior tibial artery"
    }
  },
  {
    "name": "Foot Left",
    "latinName": "Pes Sinister",
    "aliases": ["Left foot"],
    "system": "SKELETAL",
    "category": "BONE",
    "svgPathIds": {
      "SKELETAL": ["FootLeft", "TarsalsLeft", "MetatarsalsLeft", "PhalangesFootLeft"]
    },
    "description": "The human foot is a complex structure consisting of 26 bones (in each foot) along with muscles, ligaments, and nerves.",
    "metadata": {
      "boneCount": 26,
      "components": ["7 tarsal bones", "5 metatarsal bones", "14 phalanges"],
      "articulations": ["Tibia", "Fibula"]
    }
  }
]
```

**Action Items:**
- [ ] Create `prisma/data/bones.json`
- [ ] Add at least 206 bone records (can start with skeleton + major bones, then expand)
- [ ] Ensure each has name, latinName, system, category, svgPathIds mapping, description, metadata
- [ ] Verify JSON is valid: `node -c prisma/data/bones.json`

**Step 2.3: Create Muscle Data File**

Create `prisma/data/muscles.json` — comprehensive list of major human muscles (start with ~100, expand to 600+).

```json
[
  {
    "name": "Biceps Brachii",
    "latinName": "Biceps Brachii",
    "aliases": ["Biceps"],
    "system": "MUSCULAR",
    "category": "MUSCLE",
    "svgPathIds": { "MUSCULAR": ["BicepsBrachiiLeft", "BicepsBrachiiRight"] },
    "description": "The biceps brachii is an arm muscle that spans the shoulder and elbow joints and is involved in shoulder flexion and forearm supination.",
    "metadata": {
      "origin": "Scapula",
      "insertion": "Radius",
      "action": ["Forearm flexion", "Shoulder flexion", "Forearm supination"],
      "innervation": "Musculocutaneous nerve"
    }
  }
]
```

**Action Items:**
- [ ] Create `prisma/data/muscles.json`
- [ ] Add at least 100 muscle records initially
- [ ] Same structure as bones.json: name, latinName, system: MUSCULAR, category: MUSCLE, metadata with origin/insertion/action/innervation

**Step 2.4: Rewrite Seed Script**

Rewrite `prisma/seed.ts` to:
1. Read bones.json and muscles.json
2. For each structure, gather SVG path IDs from svg-paths-inventory.json
3. Generate semantic embeddings via OpenAI API
4. Insert into database

```typescript
// prisma/seed.ts
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';

const prisma = new PrismaClient();

// Types
interface BoneData {
  name: string;
  latinName: string;
  aliases: string[];
  system: 'SKELETAL' | 'MUSCULAR' | 'VASCULAR' | 'NERVOUS' | 'ENDOCRINE';
  category: string;
  svgPathIds: Record<string, string[]>;
  description: string;
  metadata: any;
}

interface SvgPathInventory {
  [system: string]: {
    id: string;
    system: string;
    viewBox?: string;
    boundingBox?: { x: number; y: number; width: number; height: number };
  }[];
}

// Load data files
function loadDataFiles(): BoneData[] {
  const bonesPath = path.join(__dirname, 'data', 'bones.json');
  const musclesPath = path.join(__dirname, 'data', 'muscles.json');
  
  const structures: BoneData[] = [];
  
  if (fs.existsSync(bonesPath)) {
    const bones = JSON.parse(fs.readFileSync(bonesPath, 'utf-8'));
    structures.push(...bones);
  } else {
    console.warn('⚠️  bones.json not found at', bonesPath);
  }
  
  if (fs.existsSync(musclesPath)) {
    const muscles = JSON.parse(fs.readFileSync(musclesPath, 'utf-8'));
    structures.push(...muscles);
  } else {
    console.warn('⚠️  muscles.json not found at', musclesPath);
  }
  
  return structures;
}

// Load SVG paths inventory
function loadSvgPathsInventory(): SvgPathInventory {
  const inventoryPath = path.join(__dirname, 'data', 'svg-paths-inventory.json');
  
  if (!fs.existsSync(inventoryPath)) {
    console.warn('⚠️  svg-paths-inventory.json not found. Run: npm run extract-svg');
    return {};
  }
  
  return JSON.parse(fs.readFileSync(inventoryPath, 'utf-8'));
}

// Generate embedding via OpenAI API
async function generateEmbedding(text: string): Promise<number[]> {
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    console.warn('⚠️  OPENAI_API_KEY not set. Using random embedding.');
    // Return random embedding for testing
    return Array(1536).fill(0).map(() => Math.random());
  }
  
  try {
    const response = await axios.post(
      'https://api.openai.com/v1/embeddings',
      {
        input: text,
        model: 'text-embedding-3-small'
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    return response.data.data[0].embedding;
  } catch (error) {
    console.error('Error generating embedding:', error);
    throw error;
  }
}

// Map SVG paths to structures
function mapSvgPaths(svgPathIds: Record<string, string[]>, inventory: SvgPathInventory) {
  const svgPaths: any[] = [];
  
  for (const [system, pathIds] of Object.entries(svgPathIds)) {
    const systemPaths = inventory[system] || [];
    
    for (const pathId of pathIds) {
      const pathInfo = systemPaths.find(p => p.id === pathId);
      
      if (pathInfo) {
        svgPaths.push({
          id: pathInfo.id,
          system: pathInfo.system,
          viewBox: pathInfo.viewBox,
          x: pathInfo.boundingBox?.x,
          y: pathInfo.boundingBox?.y,
          width: pathInfo.boundingBox?.width,
          height: pathInfo.boundingBox?.height,
          boundingBox: pathInfo.boundingBox
        });
      } else {
        console.warn(`⚠️  SVG path "${pathId}" for system "${system}" not found in inventory`);
      }
    }
  }
  
  return svgPaths;
}

async function main() {
  console.log('🌱 Seeding database...\n');
  
  // Clear existing data
  await prisma.structure.deleteMany({});
  console.log('✓ Cleared existing structures');
  
  // Load data
  const structures = loadDataFiles();
  const svgInventory = loadSvgPathsInventory();
  
  console.log(`✓ Loaded ${structures.length} structures`);
  console.log(`✓ Loaded SVG paths for ${Object.keys(svgInventory).length} systems\n`);
  
  // Seed structures
  let created = 0;
  let failed = 0;
  
  for (const struct of structures) {
    try {
      console.log(`Creating: ${struct.name}...`);
      
      // Generate embedding
      const embeddingText = `${struct.name} ${struct.latinName} ${struct.description}`;
      const embedding = await generateEmbedding(embeddingText);
      
      // Map SVG paths
      const svgPaths = mapSvgPaths(struct.svgPathIds, svgInventory);
      
      // Get first SVG path ID for backwards compatibility
      const firstSvgPathId = svgPaths.length > 0 ? svgPaths[0].id : undefined;
      
      // Create structure
      await prisma.structure.create({
        data: {
          name: struct.name,
          latinName: struct.latinName,
          system: struct.system,
          category: struct.category,
          aliases: struct.aliases || [],
          description: struct.description,
          svgPathId: firstSvgPathId,
          svgPaths: svgPaths,
          metadata: struct.metadata || {},
          embedding: embedding
        }
      });
      
      created++;
    } catch (error) {
      console.error(`✗ Failed to create ${struct.name}:`, error);
      failed++;
    }
  }
  
  console.log(`\n✅ Seeding complete: ${created} created, ${failed} failed`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

**Action Items:**
- [ ] Rewrite `prisma/seed.ts` with code above
- [ ] Add to root `package.json` scripts: `"seed": "node --loader ts-node/esm prisma/seed.ts"`
- [ ] Add to root `package.json` scripts: `"extract-svg": "ts-node scripts/extract-svg-paths.ts"`
- [ ] Set environment variable: `OPENAI_API_KEY=sk-...`
- [ ] Run: `npm run extract-svg` to generate SVG inventory
- [ ] Run: `npm run seed` to populate database
- [ ] Verify in `npx prisma studio`: should see 206+ bone records + 100+ muscle records with svgPaths arrays populated

---

### PHASE 3: Backend API Expansion

**Goal:** Extend backend routes and controllers to provide endpoints for FE to fetch and query structures efficiently.

**Files to Modify:**
- `src/routes/structures.ts`
- `src/controllers/structureController.ts`

**Step 3.1: Expand Controller Functions**

Open `src/controllers/structureController.ts` and add new endpoint handlers.

**Current (keep these):**
```typescript
export const getAllStructures = asyncHandler(async (req, res) => { ... });
export const getStructureById = asyncHandler(async (req, res) => { ... });
```

**Add these new handlers:**
```typescript
import { PrismaClient } from '@prisma/client';
import { BulkStructureQuery, SvgPathLookup, SemanticSearch } from '../lib/schemas';

const prisma = new PrismaClient();

/**
 * GET /structures/bulk
 * Fetch all structures for a given system with pagination
 * Query params: ?system=SKELETAL&limit=100&offset=0
 */
export const getBulkStructures = asyncHandler(async (req, res) => {
  const { system, limit, offset } = req.query as unknown as BulkStructureQuery;

  const where = system ? { system } : {};
  
  const [structures, total] = await Promise.all([
    prisma.structure.findMany({
      where,
      select: {
        id: true,
        name: true,
        latinName: true,
        system: true,
        category: true,
        svgPaths: true,
        coordinates: true,
        aliases: true,
        description: true,
        metadata: true,
        createdAt: true,
        updatedAt: true
        // Exclude embedding for performance
      },
      take: limit,
      skip: offset,
      orderBy: { name: 'asc' }
    }),
    prisma.structure.count({ where })
  ]);

  res.json({
    data: structures,
    pagination: {
      total,
      limit,
      offset,
      hasMore: offset + limit < total
    }
  });
});

/**
 * GET /structures/by-svg-path
 * Find structure(s) by SVG path IDs
 * Query params: ?pathIds=FootLeft,TarsalsLeft&system=SKELETAL
 */
export const getStructuresBySvgPath = asyncHandler(async (req, res) => {
  const { pathIds, system } = req.query as unknown as SvgPathLookup;

  if (!pathIds || pathIds.length === 0) {
    return res.status(400).json({ error: 'pathIds parameter required' });
  }

  // Find structures where svgPaths array contains any of the requested path IDs
  const structures = await prisma.structure.findMany({
    where: {
      AND: [
        system ? { system } : {},
        {
          svgPaths: {
            some: {
              id: { in: pathIds }
            }
          }
        }
      ]
    },
    select: {
      id: true,
      name: true,
      latinName: true,
      system: true,
      category: true,
      svgPaths: {
        where: { id: { in: pathIds } } // Only return matched paths
      },
      coordinates: true,
      description: true,
      metadata: true
    }
  });

  if (structures.length === 0) {
    return res.status(404).json({
      error: `No structures found for SVG paths: ${pathIds.join(', ')}`
    });
  }

  res.json({ data: structures, count: structures.length });
});

/**
 * GET /structures/search
 * Semantic search using pgvector embeddings
 * Query params: ?q=femur&system=SKELETAL&limit=10
 */
export const searchStructures = asyncHandler(async (req, res) => {
  const { q, system, limit } = req.query as unknown as SemanticSearch;

  if (!q) {
    return res.status(400).json({ error: 'Search query (q) required' });
  }

  try {
    // Generate embedding for search query
    const embedding = await generateEmbedding(q);

    // Raw SQL for similarity search using pgvector
    const results = await prisma.$queryRaw`
      SELECT 
        id,
        name,
        "latinName",
        system,
        category,
        description,
        (embedding <-> $1) as similarity
      FROM "Structure"
      WHERE ${system ? `system = ${system}` : 'true'}
      ORDER BY similarity ASC
      LIMIT ${limit}
    `;

    res.json({
      query: q,
      results: results.map((r: any) => ({
        ...r,
        relevance: Math.round((1 - r.similarity) * 100) // Convert distance to relevance %
      }))
    });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Search failed' });
  }
});

/**
 * GET /systems
 * List available anatomical systems with metadata
 */
export const getSystems = asyncHandler(async (req, res) => {
  const systems = ['SKELETAL', 'MUSCULAR', 'VASCULAR', 'NERVOUS', 'ENDOCRINE'];

  const systemsData = await Promise.all(
    systems.map(async (system) => ({
      system,
      count: await prisma.structure.count({ where: { system } }),
      svgFile: `svgs/${system.toLowerCase()}.svg`,
      available: true // TODO: check if SVG file exists
    }))
  );

  res.json({
    systems: systemsData,
    total: systemsData.reduce((sum, s) => sum + s.count, 0)
  });
});

// Helper function to generate embedding (reuse from seed script)
async function generateEmbedding(text: string): Promise<number[]> {
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY not configured');
  }
  
  try {
    const response = await axios.post(
      'https://api.openai.com/v1/embeddings',
      { input: text, model: 'text-embedding-3-small' },
      { headers: { 'Authorization': `Bearer ${apiKey}` } }
    );
    return response.data.data[0].embedding;
  } catch (error) {
    throw new Error(`Failed to generate embedding: ${error}`);
  }
}
```

**Action Items:**
- [ ] Add new functions to `src/controllers/structureController.ts`
- [ ] Import necessary dependencies: `axios` (already have), `Prisma` types
- [ ] Verify TypeScript compilation: `npx tsc --noEmit`

**Step 3.2: Add Routes**

Open `src/routes/structures.ts` and register new endpoints.

**Current (keep these):**
```typescript
router.get('/', getAllStructures);
router.get('/:id', getStructureById);
```

**Add these:**
```typescript
import {
  getAllStructures,
  getStructureById,
  getBulkStructures,        // NEW
  getStructuresBySvgPath,    // NEW
  searchStructures,          // NEW
  getSystems                 // NEW
} from '../controllers/structureController';

// Keep existing routes
router.get('/', getAllStructures);
router.get('/:id', getStructureById);

// Add new routes BEFORE the :id route (more specific routes first)
router.get('/bulk', getBulkStructures);
router.get('/by-svg-path', getStructuresBySvgPath);
router.get('/search', searchStructures);
router.get('/systems', getSystems);
```

**Action Items:**
- [ ] Update `src/routes/structures.ts` with new routes
- [ ] Test endpoints with curl or Postman:
  - `GET http://localhost:3000/api/structures/systems`
  - `GET http://localhost:3000/api/structures/bulk?system=SKELETAL`
  - `GET http://localhost:3000/api/structures/by-svg-path?pathIds=FemurLeft`
  - `GET http://localhost:3000/api/structures/search?q=femur`

---

### PHASE 4: Frontend Data Architecture & Caching

**Goal:** Implement client-side data fetching, caching, and update FE to use cached data instead of making API calls on every interaction.

**Files to Create/Modify:**
- `frontend/src/hooks/useAnatomyData.ts` (create)
- `frontend/src/stores/anatomy.ts` (modify)
- `frontend/src/components/AnatomySVG.tsx` (modify)
- `frontend/src/components/SystemCanvas.tsx` (modify)

**Step 4.1: Create useAnatomyData Hook**

Create `frontend/src/hooks/useAnatomyData.ts` — manages data fetching, caching, and system switching.

```typescript
// frontend/src/hooks/useAnatomyData.ts
import { useEffect, useState } from 'react';
import { useAnatomy } from '../stores/anatomy';

interface Structure {
  id: string;
  name: string;
  latinName: string;
  system: string;
  category: string;
  svgPaths: Array<{ id: string; viewBox?: string; x?: number; y?: number; width?: number; height?: number }>;
  coordinates?: any;
  aliases?: string[];
  description: string;
  metadata?: any;
  createdAt?: string;
  updatedAt?: string;
}

interface BulkResponse {
  data: Structure[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

export function useAnatomyData() {
  const {
    structures,
    setStructures,
    loadingState,
    setLoadingState,
    svgPathToStructure,
    setSvgPathToStructure,
    error,
    setError
  } = useAnatomy();

  const [initialLoadComplete, setInitialLoadComplete] = useState(false);

  /**
   * Fetch structures for a given system
   */
  const fetchStructures = async (system: 'SKELETAL' | 'MUSCULAR' | 'VASCULAR' | 'NERVOUS' | 'ENDOCRINE') => {
    // Skip if already loaded
    if (structures[system]?.length > 0) {
      return;
    }

    setLoadingState(system, 'LOADING');
    try {
      const response = await fetch(`/api/structures/bulk?system=${system}&limit=1000`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      const data: BulkResponse = await response.json();
      
      // Store structures
      setStructures(system, data.data);

      // Build SVG path → structure lookup map
      const pathMap: Record<string, Structure> = {};
      data.data.forEach((struct) => {
        struct.svgPaths.forEach((svgPath) => {
          pathMap[svgPath.id] = struct;
        });
      });
      setSvgPathToStructure(system, pathMap);

      setLoadingState(system, 'IDLE');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(system, message);
      setLoadingState(system, 'ERROR');
      console.error(`Failed to fetch ${system} structures:`, err);
    }
  };

  /**
   * Get structure by SVG path ID (from cache)
   */
  const getStructureByPathId = (pathId: string, system: string): Structure | undefined => {
    const pathMap = svgPathToStructure[system];
    if (!pathMap) return undefined;
    return pathMap[pathId];
  };

  /**
   * On mount, fetch all visible systems
   */
  useEffect(() => {
    if (initialLoadComplete) return;

    const loadInitialData = async () => {
      // Fetch skeletal system by default
      await fetchStructures('SKELETAL');
      setInitialLoadComplete(true);
    };

    loadInitialData();
  }, []);

  return {
    structures,
    loadingState,
    error,
    fetchStructures,
    getStructureByPathId,
    initialLoadComplete
  };
}
```

**Action Items:**
- [ ] Create `frontend/src/hooks/useAnatomyData.ts`
- [ ] TypeScript should compile without errors

**Step 4.2: Update Zustand Store**

Open `frontend/src/stores/anatomy.ts` and extend with data caching.

**Current store (keep existing):**
```typescript
interface AnatomyState {
  selectedStructure: Structure | null;
  setSelectedStructure: (structure: Structure | null) => void;
  hoveredStructure: Structure | null;
  setHoveredStructure: (structure: Structure | null) => void;
  // ... rest of store
}
```

**Add new fields to state:**
```typescript
import { create } from 'zustand';

type LoadingState = 'IDLE' | 'LOADING' | 'ERROR';

interface Structure {
  id: string;
  name: string;
  latinName: string;
  system: string;
  category: string;
  svgPaths: Array<{ id: string; viewBox?: string; x?: number; y?: number; width?: number; height?: number }>;
  coordinates?: any;
  aliases?: string[];
  description: string;
  metadata?: any;
}

interface AnatomyState {
  // Existing fields
  selectedStructure: Structure | null;
  setSelectedStructure: (structure: Structure | null) => void;
  hoveredStructure: Structure | null;
  setHoveredStructure: (structure: Structure | null) => void;
  visibleSystems: Set<string>;
  toggleSystem: (system: string) => void;
  showAllSystems: () => void;
  hideAllSystems: () => void;
  highlightedIds: Set<string>;
  clearHighlight: () => void;
  setHighlightedIds: (ids: Set<string>) => void;
  isRightPanelOpen: boolean;
  setIsRightPanelOpen: (open: boolean) => void;
  isLayerControlsMinimized: boolean;
  setIsLayerControlsMinimized: (minimized: boolean) => void;

  // NEW: Data caching fields
  structures: Record<string, Structure[]>; // By system: SKELETAL -> [structures...]
  setStructures: (system: string, structures: Structure[]) => void;
  
  loadingState: Record<string, LoadingState>; // By system: SKELETAL -> 'LOADING', 'IDLE', 'ERROR'
  setLoadingState: (system: string, state: LoadingState) => void;
  
  svgPathToStructure: Record<string, Record<string, Structure>>; // By system: SKELETAL -> { pathId -> structure }
  setSvgPathToStructure: (system: string, map: Record<string, Structure>) => void;
  
  error: Record<string, string>; // By system: error messages
  setError: (system: string, error: string) => void;
}

export const useAnatomy = create<AnatomyState>((set) => ({
  // Existing implementations...
  
  // NEW: Data caching implementations
  structures: {},
  setStructures: (system, structures) =>
    set((state) => ({
      structures: {
        ...state.structures,
        [system]: structures
      }
    })),

  loadingState: {},
  setLoadingState: (system, state) =>
    set((state) => ({
      loadingState: {
        ...state.loadingState,
        [system]: state
      }
    })),

  svgPathToStructure: {},
  setSvgPathToStructure: (system, map) =>
    set((state) => ({
      svgPathToStructure: {
        ...state.svgPathToStructure,
        [system]: map
      }
    })),

  error: {},
  setError: (system, errorMsg) =>
    set((state) => ({
      error: {
        ...state.error,
        [system]: errorMsg
      }
    }))
}));
```

**Action Items:**
- [ ] Update `frontend/src/stores/anatomy.ts` with new fields and actions
- [ ] Verify TypeScript compilation

**Step 4.3: Update AnatomySVG Component**

Open `frontend/src/components/AnatomySVG.tsx` and update it to use cached data instead of making API calls on hover/click.

**Current pattern (to replace):**
```typescript
const handlePathMouseEnter = async (pathId: string) => {
  // OLD: Makes API call every time
  const response = await fetch(`/api/structures?svg_path_id=${pathId}`);
  const data = await response.json();
  // ... set hovered structure
};
```

**New pattern:**
```typescript
import { useAnatomyData } from '../hooks/useAnatomyData';

export function AnatomySVG({ systemContents }: Props) {
  const { getStructureByPathId } = useAnatomyData();
  const { setHoveredStructure, setSelectedStructure, visibleSystems } = useAnatomy();

  const handlePathMouseEnter = (pathId: string, system: string) => {
    // Lookup in cache (instant, no API call)
    const structure = getStructureByPathId(pathId, system);
    if (structure) {
      setHoveredStructure(structure);
    }
  };

  const handlePathMouseLeave = () => {
    setHoveredStructure(null);
  };

  const handlePathClick = (pathId: string, system: string) => {
    // Lookup in cache (instant, no API call)
    const structure = getStructureByPathId(pathId, system);
    if (structure) {
      setSelectedStructure(structure);
    }
  };

  // Rest of component remains same, but update SVG event listeners:
  // OLD:
  // svg.addEventListener('mouseenter', () => handlePathMouseEnter(pathId));
  // NEW:
  // svg.addEventListener('mouseenter', () => handlePathMouseEnter(pathId, system));

  return (
    <div>
      {/* SVG rendering with updated event handlers */}
    </div>
  );
}
```

**Action Items:**
- [ ] Import `useAnatomyData` hook in AnatomySVG.tsx
- [ ] Replace fetch calls in event handlers with cache lookups
- [ ] Update event listener setup to pass pathId and system
- [ ] Remove old fetch-based loading states (those are now in hook)
- [ ] Verify no console errors

**Step 4.4: Update SystemCanvas Component**

Open `frontend/src/components/SystemCanvas.tsx` and ensure it waits for initial data load.

**Update to wait for data:**
```typescript
import { useAnatomyData } from '../hooks/useAnatomyData';

export function SystemCanvas({ systemContents }: Props) {
  const { initialLoadComplete, loadingState } = useAnatomyData();

  if (!initialLoadComplete) {
    return <div>Loading anatomical systems...</div>;
  }

  // Check if any system is in error state
  const systemsInError = Object.entries(loadingState).filter(([_, state]) => state === 'ERROR');
  if (systemsInError.length > 0) {
    return <div>Error loading: {systemsInError.map(([s]) => s).join(', ')}</div>;
  }

  return (
    <AnatomySVG systemContents={systemContents} />
  );
}
```

**Action Items:**
- [ ] Update `frontend/src/components/SystemCanvas.tsx`
- [ ] Verify it waits for data before rendering SVG

---

### PHASE 5: AI Integration Features (Learning Opportunity)

**Goal:** Add semantic search and LLM-powered analysis endpoints to deepen AI integration skills.

**Note:** These can be implemented after Phase 4 is complete. Recommended to implement one at a time.

**Step 5.1: Semantic Search Component (FE)**

Create `frontend/src/components/SemanticSearch.tsx`:
- Text input for search query
- Calls `GET /structures/search?q=...`
- Displays ranked results
- On click, highlights matching structure(s) on SVG

**Step 5.2: LLM Analysis Endpoint (BE)**

Add to `src/controllers/structureController.ts`:

```typescript
/**
 * POST /structures/:id/analyze
 * Stream LLM analysis of a structure using context from DB
 */
export const analyzeStructure = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const structure = await prisma.structure.findUnique({ where: { id } });
  if (!structure) {
    return res.status(404).json({ error: 'Structure not found' });
  }

  // Build context prompt
  const context = `
    Structure: ${structure.name} (${structure.latinName})
    Category: ${structure.category}
    System: ${structure.system}
    Description: ${structure.description}
    Metadata: ${JSON.stringify(structure.metadata, null, 2)}
  `;

  // Stream LLM response
  const stream = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [{
      role: 'user',
      content: `Provide a detailed anatomical analysis of this structure:\n${context}`
    }],
    stream: true
  });

  res.setHeader('Content-Type', 'text/event-stream');
  
  for await (const chunk of stream) {
    if (chunk.choices[0]?.delta?.content) {
      res.write(`data: ${JSON.stringify({ text: chunk.choices[0].delta.content })}\n\n`);
    }
  }
  
  res.write('data: [DONE]\n\n');
  res.end();
});
```

---

### PHASE 6: SVG Standardization & Validation

**Goal:** Ensure all SVG path IDs follow a consistent naming scheme and all mappings are validated.

**Step 6.1: Rename Generic SVG IDs**

In `frontend/public/svgs/skeleton.svg`:
- Replace generic IDs like `path15`, `path17` with anatomical names
- Ensure naming consistency: `{StructureName}{Laterality}_{DetailLevel}` or similar
- Example: `path107` → `TibiaLeft_body` (if it's part of the tibia)

**Action Items:**
- [ ] Create `scripts/rename-svg-ids.ts` to safely rename IDs
- [ ] Or manually update skeleton.svg with Find & Replace
- [ ] Verify no IDs are duplicated
- [ ] Re-run `npm run extract-svg` to update inventory

**Step 6.2: Add Validation Endpoints**

Add to routes:

```typescript
/**
 * POST /admin/validate-svg-mapping
 * Check for orphaned structures or unmapped SVG paths
 */
export const validateSvgMapping = asyncHandler(async (req, res) => {
  const structures = await prisma.structure.findMany({ include: { svgPaths: true } });
  const orphaned = structures.filter(s => !s.svgPaths || s.svgPaths.length === 0);

  res.json({
    totalStructures: structures.length,
    orphanedStructures: orphaned,
    orphanedCount: orphaned.length,
    message: orphanedCount === 0 ? 'All structures mapped' : `${orphanedCount} structures without SVG paths`
  });
});
```

---

### PHASE 7: Scale to Other Systems

**Goal:** Repeat bootstrap process for muscular, vascular, nervous, and endocrine systems.

**For each system:**

1. Verify SVG exists in `frontend/public/svgs/{system}.svg`
2. Run `npm run extract-svg` (extracts all path IDs)
3. Create `.json` data file: `prisma/data/{system}s.json` with all structures
4. Run `npm run seed`
5. Verify data in studio: should see system structures with svgPaths populated
6. Test FE: toggle system visibility, hover over elements, verify structure data displays

**Repeat for:** MUSCULAR, VASCULAR, NERVOUS, ENDOCRINE

---

## Implementation Order

**Recommended sequence to avoid blockers:**

1. **Phase 1: Database** (independent, no dependencies)
2. **Phase 2: Data + Seed** (depends on Phase 1)
3. **Phase 3: Backend Routes** (depends on Phase 1-2)
4. **Phase 4: Frontend** (depends on Phase 3)
5. **Phase 6: SVG Standards** (can parallel with Phase 4)
6. **Phase 5: AI Features** (depends on Phase 4, no deadline)
7. **Phase 7: Scale Systems** (depends on Phases 1-4)

---

## Verification Checklist

- [ ] **Schema Migration:** `npx prisma migrate dev` succeeds; `npx prisma studio` shows new fields
- [ ] **Seeding:** `npm run seed` completes; 206+ bones + 100+ muscles visible in studio
- [ ] **SVG Inventory:** `npm run extract-svg` generates json with pathIds per system
- [ ] **BE Endpoints:** All 4 new endpoints respond with valid data
- [ ] **FE Data Hook:** `useAnatomyData` compiles and fetches data on mount
- [ ] **FE Caching:** Single bulk API call per system on app start (visible in Network tab)
- [ ] **FE Interaction:** Hover/click on SVG instantly displays structure (no loading state)
- [ ] **SVG Mapping:** All DB structures have svgPaths; all SVG pathIds map to structures
- [ ] **Search:** Semantic search returns relevant results ranked by similarity
- [ ] **Performance:** App loads and responds in < 2s for 206 structures; no console errors

---

## Key Design Decisions

1. **One record per structure, multiple SVG paths** — Keeps DB ~900 records; enables fine-grained rendering
2. **Backend as source of truth** — All structure definitions centralized; FE API-driven
3. **SVG metadata in DB** — Enables AI analysis, future visualization, without parsing SVGs on FE
4. **Full bootstrap immediately** — 206 bones + 600 muscles available now for AI exploration
5. **Embeddings first-class** — Semantic search baked in; supports AI engineer learning goal

---

## Further Considerations

**Data Sources:** Gray's Anatomy (trusted, licensing complex), FMA (gold standard, registration required), public domain datasets (recommended start)

**Laterality:** Current approach (FemurLeft/FemurRight separate records) is simpler than single Femur with laterality field. Allows per-side embeddings and future side-specific analysis.

**Performance at Scale:** 206 bones + 600+ muscles rendered simultaneously (opacity toggle) should work; verify in Phase 4. If slow, implement: lazy-load visibility subsets, WebGL rendering, or on-demand path visibility.

**Future:** AI-powered SVG path labeling (LLM suggests names), auto-generate medical reports from selected structures, 3D anatomy view from SVG + embeddings

---

**Status:** Ready for implementation

**Next Step:** Start with Phase 1 (database schema migration)

