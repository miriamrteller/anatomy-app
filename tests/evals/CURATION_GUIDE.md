# Benchmark Dataset Curation Guide

## Overview
The benchmark dataset contains 80 realistic anatomy questions used to evaluate the chatbot. Each query tests specific aspects of the RAG pipeline, tool-calling, and response quality.

---

## Schema Reference

Each query entry in `benchmark-dataset.json` has:

```typescript
{
  id: string                           // Unique ID: "{category}-{number:03d}"
  category: string                     // One of: straightforward, common-student, system-specific, edge-case, multi-turn
  difficulty: number                   // 1-5 scale (1=trivial, 5=complex)
  query: string                        // The actual question to ask the chatbot
  description: string                  // Brief explanation of what this tests
  expectedStructures: string[]         // Array of SVG bone IDs expected to be found (e.g., ["femur-left", "femur-right"])
  expectedToolCalls: string[]          // Array of tools GPT should call (e.g., ["highlight_structures", "show_layer"])
  expectedSystems: string[]            // Body systems relevant to this query (e.g., ["SKELETAL", "MUSCULAR"])
  answerMustContain: string[]          // Words/phrases that MUST appear in the correct answer
  answerMustNotContain: string[]       // Words/phrases that should NOT appear (for detecting hallucination)
  notes: string                        // Internal notes about edge cases, known issues, or scoring caveats
}
```

---

## How to Find SVG Bone IDs

**Reference files:**
- `prisma/data/anatomical-reference.json` — List of all bones in database
- `frontend/public/svgs/bone-ids.txt` — Actual SVG group IDs that exist in the skeleton
- `prisma/data/svg-paths-inventory.json` — Mapping of database structures to SVG paths

**Cross-reference process:**
1. Identify the bone name (e.g., "femur")
2. Check `anatomical-reference.json` for exact database entry
3. Look in `bone-ids.txt` for matching SVG ID (usually kebab-case, e.g., `femur-left`, `femur-right`)
4. If not found in `bone-ids.txt` → add to `expectedStructures: []` and note in `notes` field (it's a known gap)

**Example:**
```
Query: "Show me the femur"
→ Search bone-ids.txt for "femur"
→ Find: "femur-left", "femur-right"
→ expectedStructures: ["femur-left", "femur-right"]
```

---

## Category Breakdown (Fill ~80 queries total)

### 1. **Straightforward (20 queries)**
**Goal:** Test basic bone identification and highlighting

**Characteristics:**
- Single bone or simple anatomical structure
- No tool complexity (just highlight or describe)
- Difficulty: 1-2
- Answer format: "The [bone name] is located in [location]. It [function/description]."

**Example queries:**
- "Where is the humerus?"
- "Show me the scapula."
- "What is the tibia?"
- "Highlight the fibula."
- "Where is the sternum?"
- "Show the clavicle."
- "What is the patella?"
- "Where are the tarsals?"
- "Show me the carpals."
- "Identify the metacarpals."

**Curation notes:**
- Include both common and lesser-known bones
- Mix left/right questions with bilateral bones
- For each: list BOTH sides (e.g., humerus-left, humerus-right) in expectedStructures unless asking specifically for one side

---

### 2. **Common Student Questions (20 queries)**
**Goal:** Test factual knowledge and educational Q&A

**Characteristics:**
- Questions a student might ask in anatomy class
- May have a factual answer (number of bones, etc.)
- May ask for groups or comparisons
- Difficulty: 2-3
- Answer format: Mix of facts + highlighting

**Example queries:**
- "How many bones are in the human skeleton?"
- "What's the difference between the radius and the ulna?"
- "Can you name all the bones in my hand?"
- "What are the three main bones of the leg?"
- "How many vertebrae do we have?"
- "What bones make up the pelvis?"
- "Name all the tarsal bones."
- "How many ribs do we have and what's their purpose?"
- "What's the largest bone in the body?"
- "Explain the skull and its major bones."

**Curation notes:**
- These should be answerable with knowledge from `anatomical-reference.json`
- Include factual answers in `answerMustContain` (e.g., "206 bones", "12 pairs", "7 cervical")
- For group questions: list ALL expected bones in expectedStructures
- Add common misconceptions to `answerMustNotContain` (e.g., "206" should NOT be in "how many ribs" answer)

---

### 3. **System-Specific (15 queries)**
**Goal:** Test layer switching and cross-system understanding

**Characteristics:**
- Ask to switch to a specific system (SKELETAL, MUSCULAR, VASCULAR, NERVOUS, ENDOCRINE)
- May ask about relationships between structures in different systems
- Difficulty: 3-4
- Answer format: May use `show_layer` tool call

**Example queries:**
- "Show me the muscular system and highlight the biceps."
- "Switch to the vascular system and show me the major arteries in the leg."
- "Show the skeletal system and tell me which bones support my arm."
- "What nerves run through the arm? (Show the nervous system)"
- "Display the endocrine system and name major glands."
- "Show the digestive organs in the vascular context."

**Curation notes:**
- For each: add appropriate system to expectedSystems AND expectedToolCalls should include "show_layer"
- Map structures to the correct system from schema:
  - SKELETAL: bones (femur, tibia, etc.)
  - MUSCULAR: muscles (if in database; currently limited)
  - VASCULAR: arteries, veins (if in database)
  - NERVOUS: nerves, ganglia (if in database)
  - ENDOCRINE: glands (if in database)
- If not all systems are fully populated in DB, note in `notes` field (known gap)

---

### 4. **Edge Cases (15 queries)**
**Goal:** Test error handling, ambiguity, and known gaps

**Characteristics:**
- Ambiguous terms that could match multiple structures
- Bones in GAP-1 (known to be missing from SVG)
- Informal language or synonyms
- Trick questions or complex anatomical relationships
- Difficulty: 4-5
- Answer format: Variable (some should partially fail gracefully)

**Example queries:**
- "What is the hyoid bone?" (Known gap from GAP-1 decision matrix)
- "Show me the frontal bone." (Skull detail; likely not separated in SVG)
- "What's the difference between the pelvis and pelvic girdle?"
- "Can you highlight my phalanges?" (May be ambiguous: hand vs. foot)
- "Show me the ankle bones."
- "What's the difference between the ribs and sternum?"
- "Highlight the atlas and axis."
- "Where are the metatarsals vs metacarpals?" (Common confusion)

**Curation notes:**
- Reference `GAP-1-DECISION-MATRIX.md` for known gaps
- For expected failures: set `expectedStructures: []` and note in `notes: "Known gap: [reason]"`
- Add to `answerMustContain` what a good answer SHOULD say even if structures can't be highlighted
- Example: Hyoid query should have `answerMustContain: ["floating", "neck", "thyroid", "larynx"]` but `expectedStructures: []`

---

### 5. **Multi-Turn Scenarios (10 queries)**
**Goal:** Test conversation continuity and follow-up understanding

**Characteristics:**
- Sequences of 2-3 related questions
- Tests if agent maintains context from previous messages
- Difficulty: 4-5
- Answer format: Complex reasoning

**Format for multi-turn (split into separate entries but linked):**

```json
{
  "id": "multi-turn-001-query1",
  "category": "multi-turn",
  "sequence": 1,
  "query": "Show me the femur.",
  ...
}
{
  "id": "multi-turn-001-query2",
  "category": "multi-turn",
  "sequence": 2,
  "query": "What connects to it?",
  "context_from_previous": "The user just asked about the femur",
  "expectedToolCalls": ["get_related_structures", "highlight_structures"],
  ...
}
```

**Example sequences:**
1. Q: "Show me the tibia." → Q2: "What bones connect to it?"
2. Q: "Where are the ribs?" → Q2: "What do they protect?" → Q3: "Show me the organs protected by the rib cage."
3. Q: "Display the skeletal system." → Q2: "Now show me the muscular system." → Q3: "Which muscles attach to the femur?"

**Curation notes:**
- Create 10 sequences (multiple queries per sequence)
- Each sequence adds ~3 entries to the JSON (so ~30 entries total for this category)
- Add a `sequence` field to indicate order within multi-turn scenario
- Add `context_from_previous` field to help evaluate if agent maintains state

---

## Difficulty Scale

Use this to assign difficulty 1-5:

| Level | Definition | Example |
|-------|-----------|---------|
| 1 | Trivial | "Where is the femur?" Single bone, simple highlight. |
| 2 | Easy | "Show me the radius and ulna." Two bones, still just highlighting. |
| 3 | Medium | "How many ribs do we have?" Factual + some highlighting. Requires system knowledge. |
| 4 | Hard | "Show me the skeletal system and name major leg bones." Requires layer switching + multi-structure. |
| 5 | Complex | "Trace the blood supply to the arm." Requires tool calls, cross-system reasoning, get_related_structures. |

---

## Testing `answerMustContain` and `answerMustNotContain`

These fields help evaluate response quality:

**`answerMustContain` (quality check):**
- Any word or phrase that MUST appear in a correct answer
- Example: "femur" query → must contain ["femur", "thigh", "longest bone"]
- Used to detect if GPT mentions the right structure

**`answerMustNotContain` (hallucination check):**
- Words/phrases indicating a wrong answer
- Example: "how many ribs" → must NOT contain ["13 pairs", "26 ribs", "25"]
- Used to detect if GPT hallucinates incorrect facts

**Tips for filling these:**
- `answerMustContain`: Core anatomical terms + relevant context clues
- `answerMustNotContain`: Common mistakes, hallucinations, or off-topic content

---

## Known Issues & How to Mark Them

Reference `GAP-1-DECISION-MATRIX.md`. Currently known gaps:

| Bone(s) | Status | Curation Action |
|---------|--------|-----------------|
| Hyoid | Not in SVG | Set `expectedStructures: []`, note "Known gap" |
| Frontal, Occipital, Ethmoid, Sphenoid, Vomer | Not separated in basic SVG | Set `expectedStructures: []`, alias to "Skull/Cranium" in notes |
| Pelvic Girdle | Needs rename | Use "Pelvis" terminology; map to `pelvis` SVG ID |
| Phalanges Foot L/R | Naming inconsistency | Check if SVG uses `phalanges-left` or `phalanges-foot-left`; map accordingly |

When marking a known gap in your query:
```json
{
  ...
  "expectedStructures": [],
  "notes": "Known gap (GAP-1): Hyoid not in SVG. Evaluate as success if answer describes bone correctly even without highlight."
}
```

---

## Workflow for Curation

1. **Choose a category** (start with straightforward, then student-questions, etc.)
2. **Write the query** naturally (as a user would ask)
3. **Research the answer**:
   - Check `anatomical-reference.json` for bone/structure details
   - Check `bone-ids.txt` for SVG mapping
   - Verify expected facts (e.g., "24 ribs" not "25")
4. **Fill in metadata**:
   - expectedStructures: all SVG IDs relevant to this query
   - expectedToolCalls: what tools should be used? (usually `highlight_structures`, maybe `show_layer`)
   - expectedSystems: which body systems involved?
   - answerMustContain: core facts
   - answerMustNotContain: common mistakes
   - difficulty: 1-5 based on scale above
5. **Document edge cases** in `notes`
6. **Double-check**: Does the expected answer answer the question accurately?

---

## Tips for Better Curation

- **Variety**: Mix bone locations (upper, lower, central, skull)
- **Realism**: Write queries as actual students/patients would ask (informal OK)
- **Completeness**: When asking for "bones in the leg", list ALL relevant: femur, tibia, fibula, tarsals, metatarsals, phalanges
- **System coverage**: Ensure all 5 body systems are tested (even if some have limited data in DB)
- **Difficulty distribution**: Aim for bell curve (few trivial, most medium, few very hard)
- **Error cases**: Include questions that SHOULD gracefully fail (GAP-1 bones, ambiguities)

---

## Template: Copy This for Each New Entry

```json
{
  "id": "category-NNN",
  "category": "straightforward|common-student|system-specific|edge-case|multi-turn",
  "difficulty": 1,
  "query": "User query goes here",
  "description": "One-sentence explanation of what this tests",
  "expectedStructures": ["bone-id-1", "bone-id-2"],
  "expectedToolCalls": ["highlight_structures"],
  "expectedSystems": ["SKELETAL"],
  "answerMustContain": ["term1", "term2"],
  "answerMustNotContain": [],
  "notes": "Any edge cases or caveats"
}
```

---

## Validation Checklist Before Submitting

- [ ] All 80 queries filled out (5 examples provided + 75 to go)
- [ ] Each query has unique ID in format `{category}-{number:03d}`
- [ ] expectedStructures references real SVG IDs (or empty `[]` for known gaps)
- [ ] All expectedToolCalls are valid: `highlight_structures`, `show_layer`, or `get_related_structures`
- [ ] All expectedSystems are valid: `SKELETAL`, `MUSCULAR`, `VASCULAR`, `NERVOUS`, `ENDOCRINE`
- [ ] Difficulty ratings are 1-5 and distributed across spectrum
- [ ] answerMustContain has 3-5 key terms per query
- [ ] Known gaps (GAP-1 bones) are marked with empty expectedStructures + note
- [ ] Multi-turn queries are grouped with sequence field
- [ ] JSON is valid (can be parsed without errors)

---

## Questions?

Refer back to these sections:
- **"Where do I find bone IDs?"** → See "How to Find SVG Bone IDs"
- **"What should I put in expectedStructures?"** → See "Schema Reference" + "How to Find SVG Bone IDs"
- **"How do I handle bones not in the SVG?"** → See "Known Issues" + add to multi-turn notes
- **"Should I include all systems?"** → See "Category Breakdown" + "System-Specific" section
