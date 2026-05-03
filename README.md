# anatomy-app

## Quick Start

### Prerequisites
- **PostgreSQL must be running** before running `npm run db:setup`

**Option 1: Start PostgreSQL (easiest)**
- **Windows:** Open Services (search `services.msc`) → find `postgresql-x64-18` → right-click → Start
- **Mac:** `brew services start postgresql@16` (adjust version if needed)
- **Linux:** `sudo systemctl start postgresql`

**Option 2: Generic way (using pg_ctl command)**
```bash
# Tell PostgreSQL where its data is stored, then start it
pg_ctl -D /path/to/postgres/data start

# Example paths:
# Windows: pg_ctl -D "C:\Program Files\PostgreSQL\18\data" start
# Mac: pg_ctl -D "/usr/local/var/postgres" start
# Linux: pg_ctl -D "/var/lib/postgresql/16/main" start
```

```bash
npm run db:setup  # Generates Prisma, runs migrations, seeds database
npm run dev       # Start development server on port 3000
```

---

## Tech stack decisions

**Backend: Node + TypeScript + Express + Prisma**

This is the right call for your background. Prisma gives you type-safe database access that feels very natural coming from TypeScript React. Your schema for a bone would look something like `id, name, latin_name, system (enum: skeletal/muscular/vascular...), coordinates (Json), svg_path_id, description, embedding (vector)`. The `svg_path_id` is the crucial field that links your database record to the clickable region in the SVG. Use `Zod` for request validation — it integrates beautifully with TypeScript and Copilot generates it well.

**Database: PostgreSQL + pgvector**

Install the `pgvector` extension from the start, even before you need it. Every bone, muscle, and organ gets an embedding column that you'll populate in Phase 3. This avoids a migration headache later. For coordinates, store them as JSON — `{ x: number, y: number, width: number, height: number }` — which you'll use to drive hover hit areas on the SVG.

**Open datasets to seed with**

The Foundational Model of Anatomy (FMA) Ontology from the University of Washington is the gold standard — it's freely available, contains all 206 bones with hierarchical relationships, Latin names, and connected structures. BioPortal.bioontology.org lets you download it as JSON. Wikimedia Commons has CC-licensed anatomical SVGs that are already grouped by structure, saving you enormous manual work on the frontend mapping.

**Frontend SVG strategy**

Rather than building a 3D representation initially, use a layered 2D SVG approach — it's far more practical and actually more useful educationally. Get an SVG like the one from Wikimedia's "Human body silhouette" series where each bone is a `<path>` with an ID like `#femur-right`. You then map those IDs to your database IDs in a simple lookup object. Clicking a path fires a fetch to your `/api/structures/:id` endpoint. For the layer system — skeleton, muscle, vascular, nervous — use CSS `visibility` toggling on SVG groups, driven by Zustand store state.

For future 3D, Three.js is the natural next step. Anatomical 3D models are available in GLTF format from BioDigital Human's free tier or BodyParts3D (CC licensed). Three.js lets you attach click raycasting to meshes, which maps to the same pattern.

**AI integration: the critical path for your transition**

The RAG pipeline in Phase 3 is where your React expertise gives you an unexpected edge — you already understand async state, streaming data, and component-driven UI, which maps directly to handling streamed LLM responses and updating the SVG in real time.

For the RAG pipeline specifically: each anatomical record should be embedded as a rich string that combines all its fields — something like `"Femur: the longest bone in the human body, located in the thigh, articulating with the pelvis at the hip joint and the tibia at the knee. Part of the skeletal system. Also called the thigh bone."` Richer text = better embeddings = better retrieval.

The function calling phase (Phase 4) is where you'll really feel the transition. Defining tool schemas in JSON and watching the LLM decide which tools to call — and in what order — to answer a complex query like "trace the path of blood from the heart to the femur" is a genuinely different mental model from regular development. This is the skill that AI integration roles pay for.

**Copilot strategy throughout**

The key insight for using Copilot to learn rather than just to ship: always write the intent as a comment first, then let Copilot generate. Then read the output critically. For AI-specific code (embedding functions, prompt templates, streaming parsers), write Copilot's output in a test file first and inspect the shapes of data at each step. This builds the mental model you need to debug production issues later.

The observability setup in Phase 6 is non-negotiable if you want to be taken seriously as an AI integrator — being able to say "our RAG pipeline has 87% answer accuracy at P90 latency of 1.2 seconds and costs $0.003 per query" is the difference between a demo project and a production credential.

Here's how to use this — for each phase, **copy the prompt into Copilot Chat** (not the editor), then follow the "you do" instruction before moving to the next.

---

## Phase 1 — Backend foundation

**You do first:** Create a new folder, run `git init`, open it in VS Code.

> **Copy into Copilot Chat:**
> ```
> Create a Node.js TypeScript Express project from scratch with the following:
> - Prisma ORM connected to PostgreSQL
> - pgvector extension support in the Prisma schema
> - A `Structure` model with fields: id (uuid), name (string), latin_name (string), system (enum: SKELETAL, MUSCULAR, VASCULAR, NERVOUS, ENDOCRINE), coordinates (Json), svg_path_id (string), description (string), embedding (Unsupported("vector(1536)"))
> - A working REST endpoint GET /api/structures and GET /api/structures/:id
> - Zod validation on all routes
> - A seed script that creates 5 example bones with realistic data
> - Full TypeScript strict mode
> - Folder structure: src/routes, src/controllers, src/middleware, src/lib
> ```

**You do after:** Run the seed script, hit the endpoints in Postman or Thunder Client, confirm data returns correctly before continuing.

---

## Phase 2 — Interactive SVG frontend

**You do first:** Download the [Wikimedia human skeleton SVG](https://commons.wikimedia.org/wiki/File:Human_skeleton_front_en.svg), open it in VS Code, and manually note 5–10 path IDs (e.g. `#femur-left`). You'll need these for the mapping step.

> **Copy into Copilot Chat:**
> ```
> Create a React + Vite + TypeScript frontend project with the following:
> - Tailwind CSS configured
> - Zustand for global state
> - A component called AnatomySVG that renders an imported SVG file as an inline React component
> - Each SVG path should be hoverable and clickable, using the path's id attribute to identify the structure
> - On hover: highlight the path with a subtle fill colour change
> - On click: fetch from http://localhost:3000/api/structures?svg_path_id={id} and store the result in Zustand
> - A SidePanel component that reads from Zustand and displays the structure name, latin name, system, and description
> - A LayerControls component with toggle buttons for each system enum value (SKELETAL, MUSCULAR, VASCULAR, NERVOUS, ENDOCRINE) that shows/hides SVG groups by a data-system attribute
> - TypeScript strict mode throughout
> ```

**You do after:** Manually add `data-system="SKELETAL"` attributes to your SVG path groups. Test hover and click on at least 3 bones before moving on.

---

## Phase 3 — RAG pipeline (first real AI integration)

**You do first:** Get an OpenAI API key, add it to your `.env`. Read the [OpenAI embeddings docs](https://platform.openai.com/docs/guides/embeddings) for 20 minutes — just the overview. This phase will make more sense.

> **Copy into Copilot Chat:**
> ```
> Add a RAG (retrieval augmented generation) pipeline to my existing Express + Prisma backend:
> - A script called embed-structures.ts that fetches every Structure from the database, builds a rich text string for each one in the format: "{name}: {description}. Latin name: {latin_name}. System: {system}. SVG id: {svg_path_id}", calls the OpenAI text-embedding-3-small model to get a 1536-dimension embedding, and saves it back to the Structure record's embedding field using pgvector
> - A new POST /api/chat endpoint that accepts { question: string }, embeds the question using the same model, queries PostgreSQL using pgvector cosine similarity to find the top 5 most relevant structures, then sends those structures as context to GPT-4o with a system prompt instructing it to answer anatomy questions and always reference structure names exactly as given
> - The endpoint should stream the response using Server-Sent Events
> - Include the ids of the structures used as context in a separate SSE event called "sources" so the frontend can highlight them
> - Full error handling and TypeScript types throughout
> ```

**You do after:** Run `embed-structures.ts` to populate your embeddings. Test the `/api/chat` endpoint in Postman with streaming enabled. Check that the "sources" event returns real IDs that match your database before wiring up the frontend.

> **Copy into Copilot Chat (frontend addition):**
> ```
> Add an AI chat sidebar to my existing React anatomy app:
> - A ChatPanel component with a text input and send button
> - On send, POST to http://localhost:3000/api/chat with the question and consume the SSE stream, appending tokens to the displayed response as they arrive
> - When a "sources" SSE event is received, extract the structure ids and dispatch them to Zustand as highlightedIds
> - In AnatomySVG, any path whose svg_path_id is in highlightedIds should pulse with a CSS animation to draw the user's attention
> ```

---

## Phase 4 — Agent with function calling

**You do first:** Read the [OpenAI function calling guide](https://platform.openai.com/docs/guides/function-calling) — specifically the section on parallel tool calls. This is the most conceptually different thing you'll do in this project.

> **Copy into Copilot Chat:**
> ```
> Refactor my POST /api/chat endpoint to use OpenAI function calling with the following tools:
> - highlight_structures: accepts { ids: string[] }, description "Highlight specific anatomical structures on the diagram by their svg_path_id"
> - show_layer: accepts { system: string }, description "Switch the visible layer to show a specific body system"
> - get_related_structures: accepts { id: string }, description "Fetch all structures that are directly related to the given structure id from the database, based on matching system or overlapping coordinates"
> Implement an agent loop that runs until the model stops calling tools or reaches 5 iterations (safety limit). Each tool call result should be appended to the message history and fed back to the model. Stream partial text responses as SSE tokens as before. Send tool_call SSE events containing the tool name and arguments so the frontend can act on them in real time.
> ```

**You do after:** Test with the prompt "show me everything connected to the femur" and verify the agent calls multiple tools in sequence. Add `console.log` to each tool handler so you can see the loop running. Understand what's happening before moving on — this loop is the foundation of everything in production AI.

---

## Known Issues & Gaps (Must Fix Before Phase 6)

**Current Status:** Phases 1-4 are functionally complete but have 6 blocking gaps that must be resolved before evals and deployment (Phase 6-8) can proceed reliably.

**Coding Order** (dependency-first, not priority-first):

| Gap # | Component | Issue | Severity | Order | Impact |
|-------|-----------|-------|----------|-------|--------|
| 1 | SVG ↔ Database | Group IDs may not match structure names (FemurRight missing?) | 🔴 CRITICAL | **DO FIRST** | Everything depends on data integrity |
| 2 | Backend | Missing `/api/structures/by-svg-path/lookup` endpoint | 🔴 CRITICAL | **2nd** | Depends on Gap #1; unlocks hover/click |
| 3 | structureCache | Returns first match only, needs all matches | 🔴 CRITICAL | **3rd** | Depends on Gap #2; improves search |
| 4 | Tool Handlers | Unverified implementations of show_layer & get_related_structures | 🟡 HIGH | **4th** | Depends on structure data correct |
| 5 | System Prompt | Hard-coded SVG IDs become stale after database changes | 🟡 MEDIUM | **5th** | Tech debt; depends on Gap #1 |
| 6 | Frontend UX | Bilateral bones need single info panel entry (Left+Right grouped) | 🟡 MEDIUM | **Parallel** | Quick win; improves UX immediately |

### Detailed Gap Descriptions & Implementation Plan

**Gap #1: SVG ↔ Database Mapping** (DO FIRST — foundational)
```typescript
// Task: Verify all 130 bones in bones.json have matching SVG groups
// File: /memories/repo/svg-structure-analysis.md (known issues documented)
// Known issue: FemurRight may be missing
// Action:
// 1. Parse SVG, extract all <g> IDs with data-svg-id attributes
// 2. Compare against bones.json svgPathIds
// 3. Document missing/extra SVG groups
// 4. Either: (a) create missing SVG groups, or (b) update DB to match SVG
// Impact: BLOCKS everything; all other gaps depend on correct data
```

**Gap #2: Missing Lookup Endpoint** (DO 2nd — depends on Gap #1)
```typescript
// Need: GET /api/structures/by-svg-path/lookup?pathIds=femur-left,femur-right
// Returns: Structure[] where ANY svgPathId matches query
// File: src/controllers/structureController.ts (add new method)
// Route: src/routes/structures.ts (add new route)
// Frontend: AnatomySVG.tsx line ~95 calls this on hover/click
// Implementation: Query DB with WHERE svgPathIds @> [pathId] (PostgreSQL array containment)
// Effort: 30 min
```

**Gap #3: Cache Returns Single Match** (DO 3rd — depends on Gap #2)
```typescript
// Current: findStructureInQuestion("femur") returns first match only
// Need: Return CachedStructure[] of ALL matches
// Example: "femur" should return [Femur (Left), Femur (Right)]
// File: src/lib/structureCache.ts (modify return type)
// Update: src/controllers/chatController.ts (handle array, flatten svgPathIds)
// Effort: 30 min
// Benefit: Query "femur" now highlights BOTH left and right bones
```

**Gap #4: Verify Tool Handlers** (DO 4th — depends on structure data)
```typescript
// Task: Audit & test show_layer and get_related_structures tools
// File: src/lib/toolHandlers.ts
// Questions to answer:
// 1. Does show_layer({ system: "SKELETAL" }) actually toggle SVG visibility?
// 2. How is get_related_structures({ id }) determining relationships?
//    (No explicit DB relationships defined — inferred from system enum?)
// 3. Does agent loop properly handle parallel tool calls?
// Test: Run chat with prompt "trace all structures connected to femur"
// Effort: 1 hr (audit + test)
```

**Gap #5: Dynamic System Prompt** (DO 5th — tech debt, depends on Gap #1)
```typescript
// Current: System prompt hard-codes SVG IDs → becomes stale if SVG changes
// Fix: Generate dynamically from database on startup
// File: Create src/lib/systemPrompt.ts
// Implementation:
// - Load all structures on app startup
// - Build prompt from DB: "Available structures: Femur (Left, svg-id: femur-left), ..."
// - Update src/controllers/chatController.ts to use generated prompt
// - Add restart handler to regenerate if DB changes
// Effort: 45 min
```

**Gap #6: Bilateral Bones UI Grouping** (PARALLEL — quick UX win)
```typescript
// Current UX: SidePanel shows "Femur (Left)" and "Femur (Right)" separately
// Fix: Group bilateral bones, show single "Femur" entry with side badges
// File: Create src/lib/groupStructures.ts
// Implementation:
// - Helper function to group structures by base name (remove " (Left|Right)")
// - Update SidePanel component to display grouped structures
// - Show "Femur (L+R)" or "Femur (L)" based on which sides highlighted
// - Keep database unchanged (no migration)
// Effort: 1 hr (quick parallel fix)
// Benefit: Immediate UX improvement while other gaps are being fixed
```

### Resolution Timeline & Execution Order

**Critical Path (must complete in sequence):**
```
Gap #1: SVG ↔ DB Mapping      — 1-2 hrs (foundational)
  ↓
Gap #2: Lookup Endpoint        — 30 min (depends on Gap #1)
  ↓
Gap #3: Cache Array Returns    — 30 min (depends on Gap #2)
  ↓
Gap #4: Verify Tool Handlers   — 1 hr   (depends on Gap #3)
  ↓
Gap #5: Dynamic System Prompt  — 45 min (depends on Gap #1)
```

**Parallel Track (start simultaneously with critical path):**
```
Gap #6: Bilateral Bones UI     — 1 hr   (independent, no deps)
```

**Before Phase 6 Development:**
- [ ] Fix Gap #1 (SVG mapping) — 1-2 hrs — **START HERE**
- [ ] Implement Gap #2 (lookup endpoint) — 30 min
- [ ] Fix Gap #3 (cache returns array) — 30 min
- [ ] Verify Gap #4 (tool handlers) — 1 hr
- [ ] Address Gap #5 (dynamic prompt) — 45 min
- [ ] Implement Gap #6 (UI grouping) — 1 hr — **Can run in parallel**

**Total Sequential Time:** ~5-6 hours
**Total with Parallelization:** ~5-6 hours (Gap #6 overlaps)
**Estimated completion:** 1-2 days

All gaps must be resolved, tested, and evals passing before Phase 6 evals begin.

---

## Phase 6 — Evals and observability (Measurement Framework)

### Prerequisites

- [ ] All 6 gaps (Phase 1-4) completely fixed and verified
- [ ] Core chat system working reliably (Phase 1-4 complete)
- [ ] LangSmith account created + `LANGSMITH_API_KEY` in `.env`
- [ ] 20–30 anatomy test questions prepared (varies by eval)

### Eval Framework Structure

**Files to Create:**
```
eval/
├── runner.ts                          # Orchestrate all evals
├── test-svg-path-lookup.ts           # GAP EVAL #1 (from Phase 1-4 gaps)
├── test-cache-search.ts              # GAP EVAL #2
├── test-chat-responses.ts            # GAP EVAL #3
├── test-tool-calls.ts                # GAP EVAL #4
├── test-agent-termination.ts         # GAP EVAL #5
├── test-image-recognition.ts         # PHASE 5 EVAL #6
├── test-transcription-accuracy.ts    # PHASE 5 EVAL #7
├── test-tour-generation.ts           # PHASE 5 EVAL #8
├── datasets/
│   ├── anatomy-queries.json          # 30 test questions with expected structures
│   ├── x-ray-labels.json            # 10 labeled X-rays (ground truth)
│   ├── voice-test-cases.json        # 20 spoken queries + transcripts
│   └── tour-expected-output.json    # Expected tour outputs per system
└── results/
    └── report-YYYY-MM-DD.html       # Auto-generated HTML report
```

**Eval Dataset Format** (anatomy-queries.json):
```json
[
  {
    "id": "query-001",
    "question": "What is the femur?",
    "expected_structures": ["Femur (Left)", "Femur (Right)"],
    "expected_svg_ids": ["femur-left", "femur-right"],
    "category": "basic-definition"
  },
  {
    "id": "query-002",
    "question": "Show me everything connected to the tibia",
    "expected_structures": ["Tibia (Left)", "Femur (Left)", "Fibula (Left)", "Patella (Left)"],
    "category": "relationships",
    "note": "Tests agent tool calls"
  }
]
```

### Metrics & Scoring

**Primary: F1 Score** (structure detection accuracy)
```
Precision = |returned ∩ expected| / |returned|
Recall = |returned ∩ expected| / |expected|
F1 = 2 * (Precision * Recall) / (Precision + Recall)
```

**Tool Call Validity**
```
% Invalid = (tool calls with non-existent SVG IDs) / total_calls
Pass threshold: 0% invalid
```

**Agent Termination**
```
% Complete = (queries finishing in ≤5 iterations) / total_queries
Pass threshold: >95%
```

### Running Evals

**CLI:**
```bash
npm run eval:all              # Run all 8 evals
npm run eval:gaps-only        # Run gap evals (1-5)
npm run eval:phase5-only      # Run Phase 5 evals (6-8)
npm run eval:compare          # Compare vs baseline
```

**Output:**
```
📊 Eval Report: 2026-04-25

EVAL #1: SVG Path Lookup
  ✅ PASS (98.5% accuracy)

EVAL #2: Cache Search
  ⚠️  WARN (F1: 0.82, target: 0.85)

...

SUMMARY: 6/8 PASSED | Cost: $2.45
```

### LangSmith Integration

**Automatic Tracing:**
```typescript
import { withLangSmith } from '../lib/langsmith';

export const chatWithTracing = withLangSmith(chat, {
  name: 'chat-endpoint',
  tags: ['rag', 'agent', 'phase-4']
});
```

**Dashboard Metrics:**
- Total requests per feature
- P50/P90/P99 latency
- Error rate per tool
- Estimated cost (dollars per query)

**You do first:** Sign up for [LangSmith](https://smith.langchain.com) (free tier). Get your API key. Think of this as production observability — you're measuring what you shipped.

> **Copy into Copilot Chat:**
> ```
> Add LLM observability and an evaluation harness to my anatomy app backend:
> - Wrap every OpenAI API call with LangSmith tracing using the LangSmith SDK, tagging each trace with the feature name (rag-chat, image-analysis, tour-generation, transcription)
> - Create an eval script eval/run-evals.ts that reads a JSON file of test cases in the format { question: string, expected_structure_ids: string[] }, runs each question through the /api/chat pipeline, compares the returned source ids to the expected ids using an F1 score calculation, and outputs a summary report: total questions, average F1 score, worst performing questions
> - Create an initial eval dataset eval/anatomy-evals.json with 20 question/answer pairs covering bones, muscles, and one vascular question
> - Add a /api/metrics endpoint that returns total chat requests, average latency, and average token usage pulled from LangSmith
> ```

**You do after:** Run your evals. Your F1 score will probably be disappointing the first time — that's the point. Tweak your system prompt or embedding text format, re-run, and observe the change. Do this 3 times. You've now done what AI engineers do every day.

---

## Phase 7 — Production hardening

### Prerequisites

- [ ] All Phase 1-6 complete and tested
- [ ] `.env.example` committed (list all required variables)
- [ ] Evals passing (Phase 6)
- [ ] Docker installed locally

### Implementation Checklist

**Configuration Management:**
- [ ] Create `src/lib/config.ts` with Zod schema
  ```typescript
  const ConfigSchema = z.object({
    DATABASE_URL: z.string().url(),
    OPENAI_API_KEY: z.string().startsWith('sk-'),
    FRONTEND_URL: z.string().url(),
    NODE_ENV: z.enum(['development', 'production']).default('development'),
    PORT: z.coerce.number().default(3000),
    LANGSMITH_API_KEY: z.string().optional(),
  });
  
  export const config = ConfigSchema.parse(process.env);
  ```
- [ ] Replace all `process.env.X` with `config.X` throughout codebase
- [ ] Call `config` on startup to fail fast if missing vars

**CORS & Security:**
- [ ] Add `cors` package
- [ ] Production: allow only `config.FRONTEND_URL`
- [ ] Development: allow `http://localhost:5173`
- [ ] Set secure headers (HSTS, CSP)

**Rate Limiting:**
- [ ] Add `express-rate-limit` package
- [ ] `/api/chat`: 20 req/min per IP
- [ ] `/api/analyse-image`: 10 req/min per IP
- [ ] `/api/transcribe`: 20 req/min per IP
- [ ] `/api/tour/*`: 5 req/min per IP
- [ ] Return 429 with clear error message

**Docker:**
- [ ] Create `Dockerfile`
  ```dockerfile
  FROM node:20-alpine
  WORKDIR /app
  COPY package*.json ./
  RUN npm ci --production
  COPY dist ./dist
  RUN npx prisma generate
  EXPOSE 3000
  CMD ["node", "dist/index.js"]
  ```
- [ ] Create `.dockerignore` (node_modules, .env, dist, .git)

**Frontend Environment:**
- [ ] Replace hardcoded `http://localhost:3000` with `import.meta.env.VITE_API_URL ?? 'http://localhost:3000'`
- [ ] Create `.env.local` (dev) and `.env.production` (prod)

**Database Schema Refactor: Bone Singularization**

This refactor consolidates bilateral bones (currently stored as separate Left/Right records) into single records with a `laterality` field. This improves info panel UX and simplifies RAG retrieval.

**Implementation Checklist:**
- [ ] Create migration `20260424_consolidate_bilateral_bones`
  ```typescript
  // Consolidate ~65 bilateral bones into single records
  // Update schema:
  //   - Add laterality enum: UNILATERAL | BILATERAL | LEFT_ONLY | RIGHT_ONLY
  //   - Rename svgPathId to svgPathIds (array type)
  //   - Add leftSvgPathId, rightSvgPathId fields as aliases for convenience
  
  prisma.structure.updateMany({
    where: { name: { contains: "(Left)" } },
    data: {
      name: name.replace(" (Left)", ""),
      laterality: "BILATERAL",
      svgPathIds: ["femur-left", "femur-right"],  // array now
    }
  })
  ```
- [ ] Update Prisma schema
  ```typescript
  model Structure {
    id String @id @default(cuid())
    name String
    latinName String
    laterality String @db.Enum // UNILATERAL | BILATERAL | LEFT_ONLY | RIGHT_ONLY
    svgPathIds String[]  // PostgreSQL array: ["femur-left", "femur-right"]
    aliases String[]
    embedding Unsupported("vector(1536)")?
    // ...
  }
  ```
- [ ] Re-seed database with consolidated bones (prisma/seed.ts updates)
- [ ] Re-embed with consolidated structure text (scripts/embed-structures.ts)
  ```typescript
  // Embedding text now reflects single record:
  // "Femur: the longest bone in the human body, located in the thigh...
  //  Found bilaterally (left and right sides)"
  ```
- [ ] Update structure cache (src/lib/structureCache.ts)
  - Cache now loads 65 consolidated records instead of 130
  - Lookup by svgPathIds still works: structure.svgPathIds includes ["femur-left"]
  - Returns single Structure with laterality info
- [ ] Update chatController.ts
  - No changes needed; laterality field auto-populated in SSE 'sources' event
- [ ] Update SidePanel UI (frontend)
  - Display: "Femur" (single entry)
  - Show: laterality badge: "L+R" or "L" or "R"
  - Remove: duplicate left/right entries
- [ ] Update system prompt generator
  - Now generates: "Femur (bilateral), located in thigh, svg-paths: femur-left, femur-right"
- [ ] Run evals post-migration
  - Chat still retrieves 1 result but laterality explains both sides
  - SVG highlighting works on BOTH femur-left and femur-right when femur selected
  - Cost: ~$0.01 for re-embedding all structures

**Risk Mitigation:**
- [ ] Backup database before migration: `pg_dump` production DB
- [ ] Test migration locally first with current seed data
- [ ] Run Gap #1-5 evals after migration to confirm no regressions
- [ ] Phase 8 deployment: Include migration in Railway deployment
- [ ] Rollback plan: Keep old seed script to restore if needed

**You do after:** Test migration locally. Confirm SidePanel shows single bones. Confirm SVG highlighting works for bilateral bones. Confirm evals pass with consolidated schema.

---

**Verification:**
```bash
# Local Docker test
docker build -t anatomy-app .
docker run -p 3000:3000 --env-file .env anatomy-app

# Test endpoints
curl http://localhost:3000/api/structures

# Rate limit test (should get 429 on 21st request)
for i in {1..25}; do curl http://localhost:3000/api/chat -X POST; done
```

**You do after:** Confirm Docker build succeeds. Confirm all endpoints work inside container. Confirm rate limiting kicks in at 20 requests/min.

---

## Production Build Configuration

Before deploying, ensure your build system is production-ready. These configurations are **required** for proper ES module handling and Docker builds:

### Package.json Build Script

```json
"build": "esbuild src/index.ts --bundle --platform=node --target=node20 --format=esm --outfile=dist/index.js --packages=external"
```

**Key flags:**
- `--bundle` — Bundles all local source files (not node_modules)
- `--format=esm` — **Critical**: Outputs pure ES modules, not CommonJS interop code
- `--packages=external` — Keeps node_modules external (dependencies loaded from node_modules/)
- `--platform=node` — Targets Node.js runtime

### Source Code Imports

- **Remove `.js` extensions** from local imports: `import { foo } from "./lib/bar"` (not `"./lib/bar.js"`)
- TypeScript will resolve `.ts` files automatically
- `.js` extensions cause `tsx` (seeding) and `require()` errors in bundled output

### Dockerfile Production Stage

Ensure your production Docker stage:

```dockerfile
# Install ALL dependencies (not just production)
# - Seeding needs tsx (dev dependency)
# - Prisma migrations need @prisma/client
RUN npm ci

# Copy source code to container
COPY src ./src
COPY tsconfig.json ./

# Prisma client generation
RUN npx prisma generate

# All other copies
COPY prisma ./prisma
COPY docker-entrypoint.sh .
```

### Environment Variables (Production)

**Required on Railway/Vercel:**

| Variable | Value | Notes |
|----------|-------|-------|
| `NODE_ENV` | `production` | Controls CORS and logging |
| `PORT` | `8080` or `3000` | Railway typically uses 8080 |
| `DATABASE_URL` | `postgresql://...?sslmode=require` | **Include `?sslmode=require`** for SSL/TLS |
| `OPENAI_API_KEY` | `sk-...` | Never commit; add to platform dashboard |
| `FRONTEND_URL` | `https://your-vercel-url.vercel.app` | For CORS allow-list |

### Common Build Issues & Fixes

**Issue: `require is not defined in ES module scope`**
- **Cause**: esbuild outputting CommonJS interop code
- **Fix**: Add `--format=esm` to build script

**Issue: `Cannot find module '/app/src/lib/db'` during seeding**
- **Cause**: `.js` extensions in imports or missing `src/` in Docker
- **Fix**: Remove `.js` extensions from source; copy `src/` to production container

**Issue: `SSL error: unexpected eof while reading` in PostgreSQL logs**
- **Cause**: DATABASE_URL missing `?sslmode=require`
- **Fix**: Append `?sslmode=require` to DATABASE_URL in environment variables

---

## Phase 8 — Deployment

### Prerequisites

- [ ] Phase 7 (production hardening) complete
- [ ] Accounts created: Railway.app, Vercel.com
- [ ] OpenAI API key ready
- [ ] `.env.example` complete and committed
- [ ] Railway & Vercel CLIs installed

### Pre-Deployment Verification Checklist

Before you ship anything to production, complete all of these checks:

**Code Quality & Safety:**
- [ ] All 6 gaps (Phase 1-4) are fixed and verified ✅
- [ ] All Phase 6 evals passing (F1 score target: ≥0.80)
- [ ] Docker builds locally: `docker build -t anatomy-app .` succeeds
- [ ] No `console.log` statements left in production code
- [ ] TypeScript strict mode: `npm run build` has zero errors
- [ ] Rate limits configured and tested locally (429 at limits)
- [ ] `.env.example` lists every required variable
- [ ] `.env.example` is committed to git (no secrets)

**Environment & Secrets:**
- [ ] OpenAI API key added to Railway dashboard (not in `.env.example`)
- [ ] LangSmith API key (optional) configured
- [ ] Monthly OpenAI spend limit set to **$10-50** in OpenAI dashboard
- [ ] Separate test/prod API keys (optional but recommended)

**Database:**
- [ ] Local PostgreSQL: `npm run db:setup` completes without errors
- [ ] Seed script: `npm run seed` creates 124 bones
- [ ] Embed script: `npm run embed` populates embeddings (~$0.01)
- [ ] Migrations: `npx prisma migrate dev` creates no issues
- [ ] Database backup: Backup local DB as reference

**Frontend Build:**
- [ ] `npm run build` in frontend/ succeeds
- [ ] No TypeScript errors
- [ ] No console warnings (except non-critical ones)
- [ ] `dist/` folder generated

**API Testing (localhost):**
- [ ] Start server: `npm run dev` on port 3000
- [ ] GET `/api/structures` returns 124 bones
- [ ] GET `/api/structures/:id` returns single bone
- [ ] POST `/api/chat` with question streams response
- [ ] Sources event contains correct SVG IDs
- [ ] Rate limits work: 21st request returns 429
- [ ] Error handling: POST `/api/chat` with empty question returns 400

**Frontend Testing (localhost:5173):**
- [ ] Hover bone → SidePanel displays name + latin name
- [ ] Click bone → detail section populates
- [ ] Ask chat: "What is the femur?" → response streams + highlights bones
- [ ] Sources event highlights correct SVG paths
- [ ] No console errors in browser DevTools
- [ ] SVG renders correctly
- [ ] Responsive: works on mobile width (375px)

**Documentation:**
- [ ] README updated with actual deployed URLs
- [ ] `.env.example` is accurate and complete
- [ ] Deployment steps tested (you follow them exactly, taking screenshots)
- [ ] Troubleshooting section covers known issues

**Final Safety Check:**
- [ ] You can reach `localhost:3000` and `localhost:5173` without errors
- [ ] Evals report shows all metrics (F1, latency, cost/query)
- [ ] You understand what each metric means (bonus: write 1 sentence per metric)
- [ ] You can explain what would happen if `OPENAI_API_KEY` was wrong
- [ ] You have a rollback plan (keep pre-migration DB backup)

---

### Deployment Steps

**0. All Pre-Deployment Checks Passing** ✅ (see checklist above)

**1. Deploy Backend to Railway**

```bash
# Install CLI
npm install -g @railway/cli

# Login & initialize project
railway login
railway init

# Create PostgreSQL plugin (Railway dashboard)
# Copy auto-generated DATABASE_URL

# Deploy (Railway auto-detects Dockerfile)
railway up
```

- [ ] In Railway dashboard: Add environment variables
  - `DATABASE_URL` (auto-filled)
  - `OPENAI_API_KEY` (your key)
  - `LANGSMITH_API_KEY` (optional)
  - `NODE_ENV=production`
  - `FRONTEND_URL` (set after Vercel deploy)

- [ ] Run migrations & seed:
  ```bash
  DATABASE_URL=<railway_url> npx prisma migrate deploy
  DATABASE_URL=<railway_url> npm run seed
  DATABASE_URL=<railway_url> npx ts-node scripts/embed-structures.ts
  ```

- [ ] Verify: `curl https://<railway-url>/api/structures` → returns JSON

**2. Deploy Frontend to Vercel**

```bash
# Install CLI
npm install -g vercel

# Deploy
cd frontend
vercel
```

- [ ] Set environment variables in Vercel dashboard
  - `VITE_API_URL=https://<railway-url>`
- [ ] Redeploy: `vercel --prod`
- [ ] Verify: Visit your Vercel URL → app loads

**3. Update Backend CORS**

- [ ] Go back to Railway dashboard
- [ ] Set `FRONTEND_URL=https://<vercel-url>`
- [ ] Trigger redeploy (Railway auto-redeploys on env change)

**4. Final Smoke Tests**

Test these against your live URLs:
- [ ] Hover bone → SidePanel populates ✓
- [ ] Ask AI: "What is the femur?" → Response streams + highlights bones ✓
- [ ] Make 25 rapid requests to `/api/chat` → 429 at 20th request ✓
- [ ] (Phase 5) Upload X-ray → structures detected ✓
- [ ] (Phase 5) Speak question → transcribed + chat processes ✓
- [ ] (Phase 5) Click skeletal tour → audio plays ✓

**5. Production Safeguards**

- [ ] Set **hard monthly spend limit** in [OpenAI dashboard](https://platform.openai.com/account/billing/limits): $50
- [ ] Enable LangSmith monitoring: See costs per query
- [ ] Set up error alerting (optional: Sentry, DataDog)
- [ ] Enable Railway/Vercel analytics

### Environment Variables Reference

| Variable | Where Set | Dev | Prod | Format |
|----------|-----------|-----|------|--------|
| `DATABASE_URL` | Railway | `.env` | Auto-filled | `postgres://user:pass@host:5432/db` |
| `OPENAI_API_KEY` | Railway | `.env` | Dashboard | `sk-...` |
| `LANGSMITH_API_KEY` | Railway | `.env.local` | Dashboard | Optional |
| `FRONTEND_URL` | Railway | `http://localhost:5173` | Dashboard | Your Vercel URL |
| `NODE_ENV` | Railway | `development` | `production` | Enum |
| `VITE_API_URL` | Vercel | `.env.local` | Dashboard | Your Railway URL |

### Troubleshooting

| Issue | Cause | Fix |
|-------|-------|-----|
| CORS errors | `FRONTEND_URL` mismatch | Check trailing slashes |
| Prisma errors | Migrations not run | `prisma migrate deploy` |
| 500 on `/api/chat` | Missing `OPENAI_API_KEY` | Set in Railway dashboard |
| No structure data | `seed` not run | `npm run seed` in Railway |
| Image upload fails | Missing `LANGSMITH_API_KEY` (optional but logged) | Set in .env or Railway |

**You do after:** Share your Vercel URL. Record a 90-second Loom demo showing all core features. Celebrate! 🎉

**Deploy the database and backend:**

```bash
# Login and link your project
railway login
railway init

# Deploy — Railway detects your Dockerfile automatically
railway up
```

- [ ] In Railway dashboard: add a PostgreSQL plugin to your project
- [ ] Copy the auto-generated `DATABASE_URL` — Railway injects this automatically
- [ ] Add all remaining environment variables in Railway dashboard (use `.env.example` as your checklist): `OPENAI_API_KEY`, `LANGSMITH_API_KEY`, `NODE_ENV=production`, `FRONTEND_URL` (come back and set this after Vercel is deployed)
- [ ] Run migrations against the production database:
```bash
DATABASE_URL=<railway_url> npx prisma migrate deploy
```
- [ ] Run the seed script against production:
```bash
DATABASE_URL=<railway_url> npm run seed
```
- [ ] Run the embed script against production (costs ~$0.01 in OpenAI credits):
```bash
DATABASE_URL=<railway_url> npx ts-node scripts/embed-structures.ts
```
- [ ] Confirm: hit `https://<your-railway-url>/api/structures` in the browser and get JSON back

**Deploy the frontend:**

```bash
cd frontend
vercel
# Follow prompts: framework = Vite, root = frontend/
```

- [ ] In Vercel dashboard → Settings → Environment Variables: add `VITE_API_URL=https://<your-railway-url>`
- [ ] Redeploy to pick up the variable: `vercel --prod`
- [ ] Copy your Vercel URL, go back to Railway and set `FRONTEND_URL=https://<your-vercel-url>`
- [ ] Trigger a Railway redeploy to pick up the updated CORS config

**You do after:** Run through this smoke test checklist against your live URLs before sharing with anyone:

- [ ] Hover a bone → name appears in side panel
- [ ] Click a bone → detail panel populates
- [ ] Ask the AI chat: *"what is the femur?"* → response streams and highlights bones
- [ ] Upload an X-ray image → structures are identified
- [ ] Voice input transcribes and passes to chat
- [ ] Make 25 rapid requests to `/api/chat` → 429 rate limit fires at 20
- [ ] Set a **hard monthly spend limit of $10** in your [OpenAI dashboard](https://platform.openai.com/account/limits) before sharing the URL publicly

Then update your README with live URLs:

```markdown
## Live demo
**App**: https://<your-vercel-url>
**API**: https://<your-railway-url>

### What to try
1. Hover any bone to see its name and Latin name
2. Click a bone to see detailed anatomical information
3. Ask the AI: *"Show me the femur and everything connected to it"* — watch it highlight structures and explain relationships
4. Ask a follow-up: *"What system is the femur part of?"* — see context awareness
5. Try: *"Compare the left and right sides"* — see bilateral structure handling

### Architecture
- Frontend: React + TypeScript + Vite → Vercel
- Backend: Node + Express + Prisma → Railway
- Database: PostgreSQL + pgvector → Railway
- AI: OpenAI GPT-4o (chat + function calling) + text-embedding-3-small (RAG)
- Observability: LangSmith (cost tracking, latency monitoring)

### Measurements (Evals)
- Chat accuracy (F1): 0.87
- Tool call accuracy: 98%
- Agent termination rate: 97%
- P90 latency: 1.2s
- Cost per query: $0.003
```

Record a 90-second Loom walkthrough showing all five demo steps and add the link to the README. Push everything to a public GitHub repo. This is your portfolio piece — the Loom demo is what interviewers will watch before reading a line of code.

---

**If something breaks in production:**
- **CORS errors in browser** → `FRONTEND_URL` in Railway doesn't exactly match your Vercel URL (check for trailing slash)
- **Prisma connection errors** → migration not run against production DB, or `DATABASE_URL` not set
- **AI endpoints returning 500** → `OPENAI_API_KEY` not set or quota exceeded; check logs with `railway logs`
- **Embeddings returning no results** → `embed-structures.ts` was never run against the production DB; rerun with the Railway `DATABASE_URL`
- **SVG index missing in production** → check Railway build logs for `extract-svg` output; the `prebuild` hook should have run it automatically

---

## Phase 5 — Multimodal and voice (Post-Deployment Features)

### Prerequisites

- [ ] Phase 8 deployment complete and live for ≥1 week
- [ ] All Phase 6 evals passing
- [ ] Base chat system stable in production
- [ ] Team/users have tested core features

### Why Phase 5 is After Deployment

**Deployment first gives you:**
1. Real production data to test against
2. Confidence with the deployment process (easier to ship Phase 5 updates)
3. User feedback on core features before adding complexity
4. Measured baseline (Phase 6 evals) to detect Phase 5 regressions
5. Experience with monitoring before adding expensive features (vision, voice, TTS)

**This is how real teams operate:** Ship MVP → stabilize → iterate. Not: build everything → ship all at once.

### Features to Implement

#### 5A. Image Analysis: `/api/analyse-image` (POST)

**Purpose:** User uploads X-ray/anatomy image → LLM identifies structures → highlight on SVG

**Implementation Checklist:**
- [ ] Accept base64 or multipart/form-data image upload
- [ ] Validate image: size (<10MB), format (jpeg/png/webp)
- [ ] Call GPT-4o vision: *"Identify all visible anatomical structures in this medical image. Return JSON array of structure names."*
- [ ] **Fuzzy-match LLM output to database** (critical — LLM may return "thigh bone" but DB has "Femur (Right)")
  ```typescript
  import Fuse from 'fuse.js';
  
  async function fuzzyMatchStructures(llmNames: string[]): Promise<Structure[]> {
    const all = await db.structure.findMany();
    const fuse = new Fuse(all, {
      keys: ['name', 'aliases'],
      threshold: 0.4  // Allow 40% char difference
    });
    
    const matched: Structure[] = [];
    for (const name of llmNames) {
      const results = fuse.search(name);
      if (results.length > 0) matched.push(results[0].item);
    }
    return matched;
  }
  ```
- [ ] Return Structure IDs for frontend highlighting
- [ ] Add to evals: `eval/test-image-recognition.ts` with 10 labeled medical images (target: ≥80% precision)
- [ ] Error handling: invalid image, corrupted file, LLM fails, no structures detected
- [ ] Update LangSmith tracing for cost tracking

**Response:**
```json
{
  "detected_structures": [
    { "id": "uuid", "name": "Femur", "confidence": 0.92 },
    { "id": "uuid", "name": "Tibia", "confidence": 0.87 }
  ]
}
```

**Post-Deployment Testing:**
- [ ] Test with real X-ray images (not clipart)
- [ ] Measure: cost per image, accuracy vs. expected structures
- [ ] Monitor: failed detections, average confidence scores
- [ ] Update evals: re-run Phase 6 to ensure no regressions in core chat

#### 5B. Voice Input: `/api/transcribe` (POST)

**Purpose:** User speaks question → Whisper transcribes → passes to chat flow

**Implementation Checklist:**
- [ ] Accept audio Blob/file (.wav, .mp3, .m4a, .webm)
- [ ] Validate: size (<10MB), duration (<300s), not silent
- [ ] Call Whisper API: `openai.audio.transcriptions.create()`
- [ ] Return transcribed text
- [ ] Add to evals: `eval/test-transcription-accuracy.ts` with 20 spoken anatomy questions (target: <5% WER)
- [ ] Error handling: corrupted audio, timeout, empty file
- [ ] Update LangSmith tracing

**Response:**
```json
{
  "text": "What is the medial epicondyle of the humerus?"
}
```

**Post-Deployment Testing:**
- [ ] Test in quiet environment (office)
- [ ] Test in noisy environment (background noise)
- [ ] Measure: transcription accuracy, latency
- [ ] Monitor: failed transcriptions, confidence scores
- [ ] Check budget: Whisper is ~$0.0001/minute, track total usage

#### 5C. Tour Narration: `/api/tour/:system` (GET)

**Purpose:** User clicks "Skeletal Tour" → 3-4 sentence educational narration + SVG highlight

**Implementation Checklist:**
- [ ] Route param: `system` ∈ `["SKELETAL", "MUSCULAR", "VASCULAR", "NERVOUS", "ENDOCRINE"]`
- [ ] Validate system enum
- [ ] Call GPT-4o: *"Write a 3-4 sentence educational tour of the {system} system. Be concise and medically accurate."*
- [ ] Call OpenAI TTS: `voice="alloy"`, `model="tts-1"` (or try `tts-1-hd` for quality)
- [ ] Stream MP3 audio back to frontend with caching headers
- [ ] Add to evals: `eval/test-tour-generation.ts` (manual audio quality review + accuracy)
- [ ] Error handling: invalid system, LLM fails, TTS fails
- [ ] Update LangSmith tracing

**Response:** `audio/mpeg` stream (MP3, ~10-20KB for typical tour)

**Post-Deployment Testing:**
- [ ] Test on desktop (Chrome, Safari, Firefox)
- [ ] Test on mobile (iOS Safari, Android Chrome)
- [ ] Measure: audio quality, generation latency, user engagement (listen times via analytics)
- [ ] Monitor: TTS costs (~$0.015/1000 chars), failed generations

### Rollout Strategy

**Week 1: Image Analysis**
- Deploy image endpoint with rate limiting (10 req/min)
- Feature flag in frontend (or soft launch to 10% of users)
- Monitor: accuracy, cost, errors
- Re-run Phase 6 evals to catch regressions

**Week 2: Voice Transcription**
- Deploy transcribe endpoint
- Add to chat UI
- Monitor: WER (word error rate), latency
- Track cost per minute

**Week 3: Tour Narration**
- Deploy tour endpoint
- Add tour buttons to UI
- Measure: user engagement, audio quality feedback
- Compare TTS models (`tts-1` vs `tts-1-hd`)

**Continuous:**
- Re-run Phase 6 evals weekly
- Monitor cost per feature in LangSmith
- Adjust rate limits based on usage
- Update Phase 6 evals with Phase 5 test cases

### Cost & Rate Limiting (Phase 5)

**Cost per request:**
- Vision (image): ~$0.01/image
- Whisper (voice): ~$0.0001/min audio
- TTS (tour): ~$0.015/1000 chars (~$0.10 per tour narration)

**Recommended rate limits:**
```typescript
const imageLimiter = rateLimit({ windowMs: 60000, max: 10 });  // 10/min
const transcribeLimiter = rateLimit({ windowMs: 60000, max: 20 });  // 20/min
const tourLimiter = rateLimit({ windowMs: 60000, max: 5 });  // 5/min

app.post('/api/analyse-image', imageLimiter, analyseImage);
app.post('/api/transcribe', transcribeLimiter, transcribe);
app.get('/api/tour/:system', tourLimiter, getTour);
```

**Projected monthly costs (Phase 5 only):**
- 100 images/day @ $0.01 = $30/month
- 200 transcriptions/day @ $0.0001/min (avg 2min) = $1.20/month
- 50 tours/day @ $0.10 = $150/month
- **Total Phase 5: ~$180/month** (adjust rates accordingly)

**You do after:** Start with image analysis only. Get it stable for 1 week. Add voice once you're confident with deployment process. Add tours last (higher cost). Measure everything in Phase 6 evals.

---

## Phase 5 — Multimodal and voice (Post-Deployment Features)

### Prerequisites

- [ ] Phase 8 deployment complete and live for ≥1 week
- [ ] All Phase 6 evals passing
- [ ] Base chat system stable in production
- [ ] Team/users have tested core features

### Why Phase 5 is After Deployment

**Deployment first gives you:**
1. Real production data to test against
2. Confidence with the deployment process (easier to ship Phase 5 updates)
3. User feedback on core features before adding complexity
4. Measured baseline (Phase 6 evals) to detect Phase 5 regressions
5. Experience with monitoring before adding expensive features (vision, voice, TTS)

**This is how real teams operate:** Ship MVP → stabilize → iterate. Not: build everything → ship all at once.

### Features to Implement

#### 5A. Image Analysis: `/api/analyse-image` (POST)

**Purpose:** User uploads X-ray/anatomy image → LLM identifies structures → highlight on SVG

**Implementation Checklist:**
- [ ] Accept base64 or multipart/form-data image upload
- [ ] Validate image: size (<10MB), format (jpeg/png/webp)
- [ ] Call GPT-4o vision: *"Identify all visible anatomical structures in this medical image. Return JSON array of structure names."*
- [ ] **Fuzzy-match LLM output to database** (critical — LLM may return "thigh bone" but DB has "Femur (Right)")
  ```typescript
  import Fuse from 'fuse.js';
  
  async function fuzzyMatchStructures(llmNames: string[]): Promise<Structure[]> {
    const all = await db.structure.findMany();
    const fuse = new Fuse(all, {
      keys: ['name', 'aliases'],
      threshold: 0.4  // Allow 40% char difference
    });
    
    const matched: Structure[] = [];
    for (const name of llmNames) {
      const results = fuse.search(name);
      if (results.length > 0) matched.push(results[0].item);
    }
    return matched;
  }
  ```
- [ ] Return Structure IDs for frontend highlighting
- [ ] Add to evals: `eval/test-image-recognition.ts` with 10 labeled medical images (target: ≥80% precision)
- [ ] Error handling: invalid image, corrupted file, LLM fails, no structures detected
- [ ] Update LangSmith tracing for cost tracking

**Response:**
```json
{
  "detected_structures": [
    { "id": "uuid", "name": "Femur", "confidence": 0.92 },
    { "id": "uuid", "name": "Tibia", "confidence": 0.87 }
  ]
}
```

**Post-Deployment Testing:**
- [ ] Test with real X-ray images (not clipart)
- [ ] Measure: cost per image, accuracy vs. expected structures
- [ ] Monitor: failed detections, average confidence scores
- [ ] Update evals: re-run Phase 6 to ensure no regressions in core chat

#### 5B. Voice Input: `/api/transcribe` (POST)

**Purpose:** User speaks question → Whisper transcribes → passes to chat flow

**Implementation Checklist:**
- [ ] Accept audio Blob/file (.wav, .mp3, .m4a, .webm)
- [ ] Validate: size (<10MB), duration (<300s), not silent
- [ ] Call Whisper API: `openai.audio.transcriptions.create()`
- [ ] Return transcribed text
- [ ] Add to evals: `eval/test-transcription-accuracy.ts` with 20 spoken anatomy questions (target: <5% WER)
- [ ] Error handling: corrupted audio, timeout, empty file
- [ ] Update LangSmith tracing

**Response:**
```json
{
  "text": "What is the medial epicondyle of the humerus?"
}
```

**Post-Deployment Testing:**
- [ ] Test in quiet environment (office)
- [ ] Test in noisy environment (background noise)
- [ ] Measure: transcription accuracy, latency
- [ ] Monitor: failed transcriptions, confidence scores
- [ ] Check budget: Whisper is ~$0.0001/minute, track total usage

#### 5C. Tour Narration: `/api/tour/:system` (GET)

**Purpose:** User clicks "Skeletal Tour" → 3-4 sentence educational narration + SVG highlight

**Implementation Checklist:**
- [ ] Route param: `system` ∈ `["SKELETAL", "MUSCULAR", "VASCULAR", "NERVOUS", "ENDOCRINE"]`
- [ ] Validate system enum
- [ ] Call GPT-4o: *"Write a 3-4 sentence educational tour of the {system} system. Be concise and medically accurate."*
- [ ] Call OpenAI TTS: `voice="alloy"`, `model="tts-1"` (or try `tts-1-hd` for quality)
- [ ] Stream MP3 audio back to frontend with caching headers
- [ ] Add to evals: `eval/test-tour-generation.ts` (manual audio quality review + accuracy)
- [ ] Error handling: invalid system, LLM fails, TTS fails
- [ ] Update LangSmith tracing

**Response:** `audio/mpeg` stream (MP3, ~10-20KB for typical tour)

**Post-Deployment Testing:**
- [ ] Test on desktop (Chrome, Safari, Firefox)
- [ ] Test on mobile (iOS Safari, Android Chrome)
- [ ] Measure: audio quality, generation latency, user engagement (listen times via analytics)
- [ ] Monitor: TTS costs (~$0.015/1000 chars), failed generations

### Rollout Strategy

**Week 1: Image Analysis**
- Deploy image endpoint with rate limiting (10 req/min)
- Feature flag in frontend (or soft launch to 10% of users)
- Monitor: accuracy, cost, errors
- Re-run Phase 6 evals to catch regressions

**Week 2: Voice Transcription**
- Deploy transcribe endpoint
- Add to chat UI
- Monitor: WER (word error rate), latency
- Track cost per minute

**Week 3: Tour Narration**
- Deploy tour endpoint
- Add tour buttons to UI
- Measure: user engagement, audio quality feedback
- Compare TTS models (`tts-1` vs `tts-1-hd`)

**Continuous:**
- Re-run Phase 6 evals weekly
- Monitor cost per feature in LangSmith
- Adjust rate limits based on usage
- Update Phase 6 evals with Phase 5 test cases

### Cost & Rate Limiting (Phase 5)

**Cost per request:**
- Vision (image): ~$0.01/image
- Whisper (voice): ~$0.0001/min audio
- TTS (tour): ~$0.015/1000 chars (~$0.10 per tour narration)

**Recommended rate limits:**
```typescript
const imageLimiter = rateLimit({ windowMs: 60000, max: 10 });  // 10/min
const transcribeLimiter = rateLimit({ windowMs: 60000, max: 20 });  // 20/min
const tourLimiter = rateLimit({ windowMs: 60000, max: 5 });  // 5/min

app.post('/api/analyse-image', imageLimiter, analyseImage);
app.post('/api/transcribe', transcribeLimiter, transcribe);
app.get('/api/tour/:system', tourLimiter, getTour);
```

**Projected monthly costs (Phase 5 only):**
- 100 images/day @ $0.01 = $30/month
- 200 transcriptions/day @ $0.0001/min (avg 2min) = $1.20/month
- 50 tours/day @ $0.10 = $150/month
- **Total Phase 5: ~$180/month** (adjust rates accordingly)

**You do after:** Start with image analysis only. Get it stable for 1 week. Add voice once you're confident with deployment process. Add tours last (higher cost). Measure everything in Phase 6 evals.

---

## Environment variables reference

| Variable | Where set | Description |
|---|---|---|
| `DATABASE_URL` | Railway | PostgreSQL connection string |
| `OPENAI_API_KEY` | Railway | OpenAI API key (starts with `sk-`) |
| `LANGSMITH_API_KEY` | Railway | LangSmith tracing key (optional) |
| `FRONTEND_URL` | Railway | Your Vercel URL (for CORS) |
| `NODE_ENV` | Railway | Set to `production` |
| `VITE_API_URL` | Vercel | Your Railway backend URL |


## Roadmap Summary

| Phase | Focus | Status | Time | Dependencies |
|-------|-------|--------|------|______________|
| 1-4 | Core Anatomy App | ✅ Implemented | Complete | Foundation |
| 1-4 Gaps | Close 6 Blocking Gaps | ✅ Complete | 5-6 hrs | Must do before Phase 6 |
| 6 | Evals & Monitoring | 📋 Next | 1-2 wks | Phase 1-4 + Gaps |
| 7 | Production Hardening | 📋 Next | 1-2 wks | Phase 6 (includes bone schema refactor) |
| 8 | Deploy to Production | 📋 Next | 1 day | Phase 7 |
| 5 | Multimodal & Voice | 📋 Post-Deployment | 2-3 wks | Phase 8 (ship after launch) |
| - | Production Operations | 📋 Ongoing | Weekly | Monitoring + iteration |

### Critical Path to Production

```
Phase 1-4 (implemented) ✅
    ↓
Close 6 Blocking Gaps (5-6 hrs) ← START HERE
    ├─ Gap #1: SVG ↔ Database (1-2 hrs)
    ├─ Gap #2: Lookup Endpoint (30 min)
    ├─ Gap #3: Cache Array Returns (30 min)
    ├─ Gap #4: Verify Tool Handlers (1 hr)
    ├─ Gap #5: Dynamic System Prompt (45 min)
    └─ Gap #6: Bilateral Bones UI (1 hr, parallel)
    ↓
Phase 6: Evals & Monitoring (1-2 wks)
    ├─ Write eval suite
    ├─ Run 8 evals
    ├─ Measure F1, latency, costs
    └─ All evals passing
    ↓
Phase 7: Production Hardening (1-2 wks)
    ├─ Config validation (Zod)
    ├─ CORS & rate limiting
    ├─ Docker & security headers
    ├─ DB Refactor: Bone Singularization (consolidate Left/Right)
    └─ Pre-deployment checklist complete
    ↓
Phase 8: Deploy to Production (1 day)
    ├─ Railway backend + PostgreSQL
    ├─ Vercel frontend
    ├─ Smoke tests & production verification
    └─ Update README with live URLs
    ↓
✅ LIVE on production (core features)
    ↓
Phase 5: Multimodal & Voice (2-3 wks, post-launch)
    ├─ Week 1: Image analysis
    ├─ Week 2: Voice transcription
    ├─ Week 3: Tour narration
    └─ Weekly Phase 6 re-evals to catch regressions
    ↓
✅ LIVE with all features + monitoring stable
```

---

## Quick Reference: Current Architecture

**Backend: Node + Express + Prisma + PostgreSQL + pgvector**
- Structure cache (130 bones + aliases, searchable in-memory)
- RAG pipeline with OpenAI embeddings
- Agent loop with GPT-4o + function calling
- SSE streaming for real-time responses

**Frontend: React + TypeScript + Vite + Zustand**
- Interactive SVG with hover/click
- Real-time streaming chat
- Zustand global state (structures, highlights, chat)
- Responsive layout (sidebar + main SVG + chat panel)

**Database: PostgreSQL + pgvector**
- 130 bones with aliases + embeddings
- SVG path ID mapping
- Supports future expansion (muscles, organs, etc.)

**Observability: LangSmith**
- Trace all LLM calls
- Cost tracking per query
- Performance metrics (latency, error rate)

---

## How to Use This README

1. **For Phases 1-4 Gaps:** Run implementation commands from session memory `/memories/session/implementation-plan.md`
2. **For Phase 5-8:** Follow the prerequisites, implementation checklists, and verification steps above
3. **For Issues:** Check troubleshooting tables or consult `FLOW_ANALYSIS.md`
4. **For Evals:** See Phase 6 for dataset templates and running commands

**Next Step:** Complete Phase 1-4 gaps (4-5 hours). Once all gaps pass, you're ready to start Phase 5 (multimodal).
