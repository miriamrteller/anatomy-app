# GAP #1: Missing Bones - Decision Matrix

## The 9 Missing Bones (DB references SVG IDs that don't exist)

### Group 1: Foot Phalanges (Naming Inconsistency)
1. **Phalanges Foot Left** → expects SVG ID: `phalanges-foot-left`
   - Actual SVG ID: `phalanges-left`
   - **Issue:** Naming inconsistency (foot-specific vs generic)
   - **Decision Options:**
     - [ ] A) Change DB to use `phalanges-left` (rename to "Phalanges Left")
     - [ ] B) Add alias `phalanges-left` to "Phalanges Foot Left" 
     - [ ] C) Add SVG group `phalanges-foot-left` (duplicate?)

2. **Phalanges Foot Right** → expects SVG ID: `phalanges-foot-right`
   - Actual SVG ID: `phalanges-right`
   - **Same issue as above**

---

### Group 2: Pelvic Girdle (Composite vs Individual Bones)
3. **Pelvic Girdle** → expects SVG ID: `pelvic-girdle`
   - Actual SVG ID: `pelvis` (likely composite)
   - DB also has: Ilium (Left/Right), Ischium (Left/Right), Pubis (Left/Right)
   - **Issue:** "Pelvic Girdle" is the same as "Pelvis" but different naming
   - **Decision Options:**
     - [ ] A) Rename to "Pelvis" and use SVG ID `pelvis`
     - [ ] B) Add alias `pelvis` to "Pelvic Girdle"
     - [ ] C) Remove (bones are represented by Ilium/Ischium/Pubis individually)

---

### Group 3: Detailed Skull Bones (Likely Not Shown in Basic SVG)
4. **Frontal Bone** → expects SVG ID: `frontal`
   - Actual SVG has: `skull`, `cranium`, `mandible`
   - **Issue:** Detailed skull anatomy; probably not separated in basic SVG
   - **Decision Options:**
     - [ ] A) Add alias `skull` or `cranium` (it's part of cranium)
     - [ ] B) Add SVG group `frontal` (requires SVG editing)
     - [ ] C) Remove for MVP (can add back when detailed skull added)

5. **Occipital Bone** → expects SVG ID: `occipital`
   - **Same as Frontal Bone** (part of cranium)

6. **Ethmoid Bone** → expects SVG ID: `ethmoid`
   - **Same as Frontal Bone** (part of cranium)

7. **Sphenoid Bone** → expects SVG ID: `sphenoid`
   - **Same as Frontal Bone** (part of cranium)

8. **Vomer** → expects SVG ID: `vomer`
   - **Same as Frontal Bone** (part of cranium/nasal region)

---

### Group 4: Neck/Laryngeal Bone (Specialized)
9. **Hyoid Bone** → expects SVG ID: `hyoid`
   - Unique floating bone in neck
   - Actual SVG: No `hyoid` group
   - **Issue:** Specialized anatomy; probably not in basic SVG
   - **Decision Options:**
     - [ ] A) Add alias (but what bone to alias to? It's unique)
     - [ ] B) Add SVG group `hyoid` (requires SVG editing)
     - [ ] C) Remove for MVP

---

## Summary of Options by Strategy

### Strategy 1: Fix via Aliases (No SVG changes needed)
- ✅ Quick fix
- ✅ Preserves anatomical data
- ❌ Bones won't be individually highlightable
- Candidates: Phalanges (Foot), Pelvic Girdle, Skull bones (make aliases to "Skull"/"Cranium")

### Strategy 2: Add to SVG (Requires SVG editing)
- ✅ Full functionality
- ❌ Requires manual SVG edits
- ❌ Requires detailed skull anatomy to be separated in SVG
- Candidates: Frontal, Occipital, Ethmoid, Sphenoid, Vomer (skull anatomy), Hyoid (neck), Phalanges (if you want separation)

### Strategy 3: Remove for MVP (Simplest)
- ✅ Fastest
- ✅ Clean data
- ❌ Lose anatomical detail
- Candidates: Detailed skull bones, Hyoid, Phalanges Foot (if using generic "Phalanges")

---

## Recommendation by Bone

| Bone | Type | Recommendation | Rationale |
|------|------|---|---|
| Phalanges Foot L/R | Naming Issue | **Fix via rename** | SVG has `phalanges-left/right`; DB should use same naming |
| Pelvic Girdle | Composite | **Rename to "Pelvis"** | SVG has `pelvis`; same structure, different name |
| Frontal, Occipital, Ethmoid, Sphenoid, Vomer | Skull Detail | **Aliases to "Cranium"** | Not separated in basic SVG; can add back later with detailed skull |
| Hyoid | Unique | **Remove for MVP** | Requires custom SVG group; rare enough for initial launch |

---

## What Would You Prefer?

1. **Quick Fix:** Rename Phalanges/Pelvic Girdle + Alias skull bones to Cranium
   - Time: 15 minutes
   - Result: 100% alignment, no new SVG highlighting for skull detail or hyoid

2. **Preserve All:** Alias strategy + keep all bones
   - Time: 15 minutes  
   - Result: Data preserved, skull/hyoid not clickable until SVG added

3. **Clean MVP:** Remove all 9 bones
   - Time: 5 minutes
   - Result: 100% clean, can add back later

**My Vote:** Option 1 (Quick Fix) because:
- ✅ Fixes data integrity immediately
- ✅ Most bones are naming/grouping issues, not new structures
- ✅ Detailed skull anatomy is beyond MVP scope
- ✅ Can easily add back later when detailed skull SVG is available
