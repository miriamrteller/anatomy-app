# SVG Utilities

Tools for analyzing and fixing SVG structure issues in the skeleton diagram.

## Problem

When hovering over certain bones (e.g., Femur Right, hand bones), the UI shows "Structure not found" errors. This happens when SVG group IDs don't match the mappings defined in `prisma/data/bones.json`.

## Scripts

### 1. `analyze-svg-structure.js`

**Purpose**: Find and analyze individual SVG groups and paths

**Usage**:
```bash
# List all group IDs in the SVG
node scripts/svg-utils/analyze-svg-structure.js

# Search for a specific group
node scripts/svg-utils/analyze-svg-structure.js FemurRight

# Find which group contains a path
node scripts/svg-utils/analyze-svg-structure.js path123
```

**Output**: 
- Shows whether a group/path exists in the SVG
- Displays parent hierarchy
- Indicates if the group is mapped to a bone in bones.json

---

### 2. `inspect-svg-hierarchy.js`

**Purpose**: Visualize the nested structure of groups and their contents

**Usage**:
```bash
# Show what's inside layer3
node scripts/svg-utils/inspect-svg-hierarchy.js layer3

# Compare structure of working groups
node scripts/svg-utils/inspect-svg-hierarchy.js FemurLeft
node scripts/svg-utils/inspect-svg-hierarchy.js Skull
```

**Output**: 
- Tree view of all nested groups
- Shows how many paths each group contains
- Marks which groups are mapped (✓) vs orphaned (✗)

---

### 3. `fix-svg-structure.js`

**Purpose**: Complete audit showing all SVG structure issues

**Usage**:
```bash
# Run complete analysis
node scripts/svg-utils/fix-svg-structure.js
```

**Output**:
- List of missing groups (in bones.json but not in SVG)
- List of orphaned groups (in SVG but not in bones.json)
- List of properly mapped groups
- Recommendations for next steps

---

### 4. `move-svg-paths.js`

**Purpose**: Move paths from one group to another

**Usage**:
```bash
# Analyze layer3 to see what's in it
node scripts/svg-utils/move-svg-paths.js layer3

# Generate move instructions for a target group
node scripts/svg-utils/move-svg-paths.js layer3 FemurRight

# Actually apply the changes
node scripts/svg-utils/move-svg-paths.js layer3 FemurRight --apply
```

**Output**:
- Shows which paths would be moved
- Provides find/replace instructions
- Creates backup and applies changes with `--apply` flag

---

## Typical Workflow

### Step 1: Identify the Problem
```bash
node scripts/svg-utils/fix-svg-structure.js
```
Look for missing or orphaned groups related to your problem bone.

### Step 2: Inspect the Issue
```bash
# If a group is missing
node scripts/svg-utils/analyze-svg-structure.js FemurRight

# If you want to see what's inside layer3
node scripts/svg-utils/inspect-svg-hierarchy.js layer3

# Compare with a working example
node scripts/svg-utils/inspect-svg-hierarchy.js FemurLeft
```

### Step 3: Analyze the SVG File
Open `frontend/public/svgs/skeleton.svg` as TEXT (right-click → "Open With" → "Text Editor")

Search for the missing group or problematic paths manually.

### Step 4: Fix the SVG

**Option A: Manual editing**
1. Open skeleton.svg as TEXT
2. Create missing `<g id="...">` elements or rename existing ones
3. Organize paths into correct groups

**Option B: Using the move script**
```bash
node scripts/svg-utils/move-svg-paths.js layer3 FemurRight --apply
```

### Step 5: Update Database If Needed
If you renamed groups or added new ID mappings, update `prisma/data/bones.json`:
```json
{
  "name": "Femur Right",
  "svgPathIds": { "SKELETAL": ["FemurRight"] }
}
```

Then reseed the database:
```bash
npm run seed
npm run build  # (frontend)
```

### Step 6: Test in Browser
- Reload the app (F5)
- Hover over the affected bone
- Verify no "Structure not found" error

---

## Common Issues & Solutions

### Issue: "FemurRight not found"
```bash
# Check if it exists
node scripts/svg-utils/analyze-svg-structure.js FemurRight

# If not found, search bones.json for where it should be
grep -i femur prisma/data/bones.json
```

### Issue: Orphaned layers (layer3, layer4, Layer_1)
```bash
# See what's inside
node scripts/svg-utils/inspect-svg-hierarchy.js layer3

# These are Inkscape organizational layers - check if mapped groups exist inside them
```

### Issue: Too many paths in one group
```bash
# Analyze the group
node scripts/svg-utils/move-svg-paths.js layer3

# See if paths should be split into sub-groups
node scripts/svg-utils/inspect-svg-hierarchy.js layer3
```

---

## File Structure

```
scripts/svg-utils/
├── analyze-svg-structure.js    # Find individual groups/paths
├── inspect-svg-hierarchy.js    # View nested structure
├── fix-svg-structure.js        # Audit all issues
├── move-svg-paths.js           # Move paths between groups
└── README.md                   # This file
```

---

## Dependencies

All scripts require `fast-xml-parser` which is installed at the project root:
```bash
npm install fast-xml-parser
```

---

## Notes

- Scripts work with `skeleton.svg` and `bones.json` from the project root
- All paths are relative to the project root (2 levels up from this folder)
- Use `--apply` flag with caution - it modifies the actual SVG file
- Always reload the browser after making SVG changes
- Most script operations are read-only until you explicitly use `--apply`

---

## Troubleshooting

**Scripts not finding files?**
- Make sure you're running from the project root: `cd /d/Miriam/Development/projects/anatomy-app`
- Or run with full path: `node scripts/svg-utils/analyze-svg-structure.js`

**Need to see error details?**
- Scripts show stack traces in console
- Check that `prisma/data/bones.json` and `frontend/public/svgs/skeleton.svg` exist

**SVG won't parse?**
- The SVG must be valid XML
- Check for unclosed tags: `node scripts/svg-utils/fix-svg-structure.js` will fail if XML is invalid
