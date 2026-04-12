# anatomy-app 
# my plan: https://claude.ai/share/84f71dfc-5247-4a22-9aff-bca0e2f1b272

# I want to create an anatomy app using AI and need help planning. The point of building this app is to transition myself from a senior react developer to an AI integration expert. With this in mind create me a clear roadmap of how to generate this app step by step in vscode using copilot, in a way I can still understand the whole project.  I need a clear and well structured backend (probably in node/typescript which is more familiar), perhaps there are open API's for these kinds of things.  I'm considering creating a database with each bone on the skeleton with an id, name, placement coordinates that can map to the FE and perhaps a vector svg for generating a 3d representation on the screen.  
# I also need advice on how to create the frontend image - in later iterations I will want the image to be dynamic, so a user have hover/click to access more features and information.  I will want to repeat this idea to add the muscle structure onto the skeleton, each muscle documented as the bones were. Then it will be followed by other biological systems such as other organs like the lungs, the vascular system and heart, the brain and nervous system, the hormone systems etc.
# Give me a well thought out and detailed plan, with suggested technology given for backend, frontend, AI integration etc. keeping in mind I am doing this to transition from a senior react.ts developer to an AI Integration expert

# Here's a comprehensive roadmap for building your AI-powered anatomy app — designed specifically to take you from senior React dev to AI integration expert, with each phase deliberately deepening your AI skills.Now let me break down each layer in detail.

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

## Phase 5 — Multimodal and voice

**You do first:** Skim the [OpenAI vision docs](https://platform.openai.com/docs/guides/vision) and the [Whisper API docs](https://platform.openai.com/docs/guides/speech-to-text). Five minutes each.

> **Copy into Copilot Chat:**
> ```
> Add three multimodal features to my anatomy app:
> - A POST /api/analyse-image endpoint that accepts a base64 image upload, sends it to GPT-4o vision with the prompt "You are an anatomy assistant. Identify all anatomical structures visible in this image and return a JSON array of structure names as they would appear in a medical reference", then fuzzy-matches the returned names against the Structure table in the database and returns the matched ids
> - A POST /api/transcribe endpoint that accepts an audio file, sends it to the Whisper API, and returns the transcribed text
> - A GET /api/tour/:system endpoint that asks GPT-4o to write a short guided tour narration (3–4 sentences) for the given body system, then sends that text to the OpenAI TTS endpoint with voice "alloy" and returns the audio as a stream
> Full TypeScript types and error handling throughout.
> ```

> **Copy into Copilot Chat (frontend addition):**
> ```
> Add to my React anatomy app:
> - An ImageUpload component with drag-and-drop that sends the image to /api/analyse-image and highlights the returned structure ids on the SVG
> - A VoiceInput component that records audio using the MediaRecorder API, sends it to /api/transcribe, then passes the transcription text into the existing chat flow
> - A TourButton component per body system that calls /api/tour/:system and plays the returned audio using the Web Audio API while the corresponding SVG layer becomes active
> ```

**You do after:** Test the image upload with an X-ray image from Google Images. Test voice input. These features are impressive in demos — make sure they work reliably before Phase 6.

---

## Phase 6 — Evals and observability

**You do first:** Sign up for [LangSmith](https://smith.langchain.com) (free tier). Get your API key. This is the hardest mindset shift — you're now thinking about your AI system as something you measure, not just something you build.

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

**Overall tip for Copilot:** After each paste, if the output looks wrong or incomplete, follow up with a second message in the same chat saying what's missing rather than starting over. Copilot has context from the previous message and will patch rather than regenerate.
