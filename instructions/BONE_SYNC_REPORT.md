# Bone Data Synchronization Report
## comprehensive.txt ↔ fetch-anatomical-data.ts

**Generated:** April 16, 2026  
**Total Bones in comprehensive.txt:** 206  
**Total Bones in fetch-anatomical-data.ts COMPREHENSIVE_BONES:** ~110  
**Gap:** ~96 bones (mostly individual hand/foot bones and auditory ossicles)

---

## SECTION 1: SKULL BONES (22 BONES)

### CRANIUM (8 Bones)

#### [EXISTING] Frontal Bone
- **Key:** "Frontal"
- **Latin Name:** Os frontale
- **Current Description:** "Forms the anterior and superior part of the cranium. Contains the frontal sinuses and has a prominent brow ridge."
- **NEW Description (from comprehensive.txt):** "A thick, shell-like bone forming the anterior roof of the cranium and the forehead. It contains the frontal sinuses and forms the superior margin of the orbits (eye sockets). It articulates with the parietal bones at the coronal suture and with the sphenoid, ethmoid, and nasal bones. Functionally, it protects the brain's frontal lobes and supports facial structure."
- **Action:** UPDATE — Enhanced description with detailed articulations and functional importance
- **Articulations to Add:** Parietal, Sphenoid, Ethmoid, Nasal

---

#### [EXISTING] Parietal Bones
- **Key:** "Parietal"
- **Latin Name:** Os parietale
- **Current Description:** "Forms the sides and roof of the cranium. Two bones (left and right) that meet at the sagittal suture."
- **NEW Description:** "Large, quadrilateral, paired bones forming the bulk of the cranial vault's roof and sides. They articulate with each other at the sagittal suture, the frontal bone at the coronal suture, and the occipital bone at the lambdoid suture. Their internal surface features grooves for the middle meningeal artery, making them clinically significant in head trauma cases."
- **Action:** UPDATE — Add suture details, meningeal artery grooves, clinical significance
- **Articulations to Add:** Frontal, Occipital
- **Landmarks to Add:** Sagittal suture, Coronal suture, Lambdoid suture, Meningeal grooves

---

#### [EXISTING] Temporal Bones
- **Key:** "Temporal"
- **Latin Name:** Os temporale
- **Current Description:** "Forms the sides and base of the cranium. Contains the ear canal and articulates with the mandible."
- **NEW Description:** "Complex bones at the lateral base of the skull. They house the internal auditory meatus, middle ear ossicles, and the cochlea. Landmarks include the mastoid process (muscle attachment), the zygomatic process (forming the cheek arch), and the mandibular fossa, which forms the temporomandibular joint (TMJ) with the lower jaw."
- **Action:** UPDATE — Add auditory structures, mastoid process, zygomatic process, TMJ details
- **Landmarks to Add:** Internal auditory meatus, Mastoid process, Zygomatic process, Mandibular fossa, TMJ
- **Articulations to Add:** Mandible (TMJ)

---

#### [EXISTING] Occipital Bone
- **Key:** "Occipital"
- **Latin Name:** Os occipitale
- **Current Description:** "Forms the posterior and inferior part of the cranium. Contains the foramen magnum through which the spinal cord passes."
- **NEW Description:** "Forms the posterior and inferior base of the neurocranium. It contains the foramen magnum, the primary opening for the spinal cord to connect to the brainstem. It features the occipital condyles, which articulate with the Atlas (C1) to allow for nodding motions, and the external occipital protuberance for neck muscle attachment."
- **Action:** UPDATE — Add condyles, nodding motion capability, external protuberance, brainstem connection
- **Landmarks to Add:** Occipital condyles, External occipital protuberance, Foramen magnum
- **Articulations to Add:** Atlas (C1)

---

#### [EXISTING] Sphenoid Bone
- **Key:** "Sphenoid"
- **Latin Name:** Os sphenoidale
- **Current Description:** "Located at the base of the cranium, forms the sella turcica which houses the pituitary gland. Has multiple foramina for nerves and vessels."
- **NEW Description:** "Known as the 'keystone' of the cranial floor because it articulates with all other cranial bones. Butterfly-shaped, it contains the sella turcica (a saddle-like depression housing the pituitary gland). It features the optic canals for the optic nerves and the greater/lesser wings that form part of the orbits and middle cranial fossa."
- **Action:** UPDATE — Add keystone role, butterfly shape, optic canals, greater/lesser wings
- **Landmarks to Add:** Sella turcica, Optic canals, Greater wings, Lesser wings, Middle cranial fossa
- **Metadata:** "Keystone bone" - articulates with all other cranial bones

---

#### [EXISTING] Ethmoid Bone
- **Key:** "Ethmoid"
- **Latin Name:** Os ethmoideum (currently), should be "Os ethmoidale"
- **Current Description:** "Forms part of the cranial floor and nasal septum. Contains ethmoidal air cells and contributes to the nasal cavity."
- **NEW Description:** "A light, spongy, cubical bone located between the orbits at the roof of the nose. It features the cribriform plate, perforated with tiny holes for olfactory nerves to pass to the brain. Its crista galli serves as an attachment for the falx cerebri (brain membrane), and its perpendicular plate forms the superior part of the nasal septum."
- **Action:** UPDATE — Add light/spongy material, cribriform plate, crista galli, falx cerebri, perpendicular plate
- **Landmarks to Add:** Cribriform plate, Crista galli, Perpendicular plate, Ethmoidal air cells
- **Latin Name Correction:** "Os ethmoidale" (not "Os ethmoideum")

---

### FACIAL BONES (14 Bones)

#### [EXISTING] Maxilla
- **Key:** "Maxilla"
- **Latin Name:** Maxilla
- **Current Description:** "Forms the upper jaw and palate. Holds the upper teeth and has large sinuses (maxillary sinuses)."
- **NEW Description:** "The upper jawbones that form the central facial skeleton. They house the upper teeth within the alveolar process, form the floor of the orbits, and the lateral walls of the nasal cavity. Each maxilla contains a large maxillary sinus. They articulate with every facial bone except the mandible, providing the rigid foundation for the mid-face."
- **Action:** UPDATE — Add alveolar process, orbit floor role, nasal cavity walls, articulation details
- **Teeth:** 8 (add to metadata)
- **Landmarks to Add:** Alveolar process, Maxillary sinus, Orbit floor, Nasal cavity walls

---

#### [EXISTING] Mandible
- **Key:** "Mandible" (currently missing from COMPREHENSIVE_BONES - NEED TO ADD)
- **Latin Name:** Mandibula
- **Description from comprehensive.txt:** "The largest, strongest, and only movable bone of the skull. It consists of a horizontal body housing the lower teeth and two vertical rami. The condylar process articulates with the temporal bone (TMJ), while the coronoid process serves as a lever for the temporalis muscle during chewing. It is the primary structural component of the lower face."
- **Action:** ADD NEW — This bone is critically missing from fetch-anatomical-data.ts
- **Teeth:** 8
- **Landmarks:** Condylar process, Coronoid process, Body, Rami
- **Articulations:** Temporal bone (TMJ)
- **Innervation:** Trigeminal nerve (V3)

---

#### [EXISTING] Zygomatic Bones
- **Key:** "Zygomatic"
- **Latin Name:** Os zygomaticum
- **Current Description:** "Forms the prominence of the cheek. Articulates with the frontal, temporal, and maxilla."
- **NEW Description:** "The 'cheekbones' forming the lateral wall and floor of the orbits. They articulate with the frontal, sphenoid, temporal, and maxillary bones. They provide the structural 'corners' of the face and serve as the origin for the masseter muscle, essential for powerful jaw closure."
- **Action:** UPDATE — Add orbital role, sphenoid articulation, masseter muscle attachment
- **Landmarks to Add:** Orbital wall, Orbital floor, Zygomatic process
- **Articulations to Add:** Sphenoid

---

#### [EXISTING] Nasal Bones
- **Key:** "Nasal"
- **Latin Name:** Os nasale
- **Current Description:** "Forms the bridge of the nose. Two small rectangular bones."
- **NEW Description:** "Two small, oblong bones placed side-by-side that form the bridge of the nose. While small, they provide the primary rigid support for the superior portion of the nose; the remainder of the nasal structure is composed of flexible hyaline cartilage."
- **Action:** UPDATE — Add cartilage relationship, structural support role
- **Metadata:** Primary rigid support for nose bridge

---

#### [EXISTING] Lacrimal Bones
- **Key:** "Lacrimal"
- **Latin Name:** Os lacrimale
- **Current Description:** "Small bone forming part of the medial wall of the orbit. Contains the lacrimal groove for tear ducts."
- **NEW Description:** "The smallest and most fragile facial bones, located in the medial wall of each orbit. They feature the lacrimal sulcus, which houses the lacrimal sac and nasolacrimal duct, allowing tears to drain from the eye surface into the nasal cavity."
- **Action:** UPDATE — Add fragility note, lacrimal sulcus details, tear drainage function
- **Landmarks to Add:** Lacrimal sulcus, Nasolacrimal duct
- **Metadata:** Smallest and most fragile facial bones

---

#### [EXISTING] Palatine Bones
- **Key:** "Palatine"
- **Latin Name:** Os palatinum
- **Current Description:** "Forms the posterior part of the hard palate and contributes to the nasal cavity."
- **NEW Description:** "L-shaped bones located at the posterior of the nasal cavity. They form the posterior third of the hard palate (roof of the mouth), part of the nasal floor, and a tiny portion of the orbital floor. Failure of these bones to fuse correctly during development can contribute to a cleft palate."
- **Action:** UPDATE — Add L-shape, posterior third, orbital floor role, developmental significance, cleft palate
- **Shape:** L-shaped
- **Landmarks to Add:** Hard palate (posterior third), Nasal floor, Orbital floor
- **Metadata:** Developmental importance for cleft palate

---

#### [EXISTING] Inferior Nasal Conchae
- **Key:** "Inferior Nasal Concha"
- **Latin Name:** Concha nasalis inferior
- **Current Description:** "Bony ridge in the nasal cavity that projects from the lateral wall. Extends from the maxilla."
- **NEW Description:** "Thin, curved, scroll-like bones projecting from the lateral walls of the nasal cavity. Unlike the superior/middle conchae (part of the ethmoid), these are independent bones. They function to create turbulence in inhaled air, increasing surface area for warming, moistening, and filtering."
- **Action:** UPDATE — Add scroll-like shape, independent status, air conditioning function, turbulence creation
- **Shape:** Thin, curved, scroll-like
- **Function:** Turbulence creation, air warming, moistening, filtering
- **Metadata:** Independent bones (unlike superior/middle conchae)

---

#### [EXISTING] Vomer
- **Key:** "Vomer"
- **Latin Name:** Vomer
- **Current Description:** "Unpaired bone that forms the inferior and posterior part of the nasal septum."
- **NEW Description:** "A thin, flat, plow-shaped bone situated in the midsagittal line. It articulates with the ethmoid bone and the maxillae/palatines to form the inferior and posterior portion of the bony nasal septum, which provides the primary structural division of the nasal airway."
- **Action:** UPDATE — Add plow shape, articulation details, nasal airway division role
- **Shape:** Plow-shaped
- **Articulations to Add:** Ethmoid, Maxillae, Palatines

---

### AUDITORY OSSICLES & HYOID (7 BONES)

#### [MISSING] Malleus
- **Key:** "Malleus" (NOT IN fetch-anatomical-data.ts)
- **Latin Name:** Malleus
- **Description:** "The 'hammer'; the largest of the middle ear ossicles. The 'handle' is attached to the internal surface of the tympanic membrane (eardrum), while the head articulates with the incus. It converts sound waves into mechanical vibrations."
- **Count:** 2 (Right, Left - though may need singular entry)
- **Metadata:**
  - **Bone Type:** Irregular
  - **Region:** Ear (Middle ear)
  - **Function:** Sound transduction - converts sound waves to mechanical vibrations
  - **Landmarks:** Handle, Head
  - **Articulations:** Tympanic membrane, Incus
  - **Innervation:** Trigeminal nerve (V), Facial nerve (VII)
- **Action:** ADD NEW BONE

---

#### [MISSING] Incus
- **Key:** "Incus" (NOT IN fetch-anatomical-data.ts)
- **Latin Name:** Incus
- **Description:** "The 'anvil'; the middle bone of the ossicular chain. It acts as a lever, receiving vibrations from the malleus and transmitting them to the stapes. This chain of bones amplifies sound pressure before it reaches the fluid-filled inner ear."
- **Count:** 2 (Right, Left)
- **Metadata:**
  - **Bone Type:** Irregular
  - **Region:** Ear (Middle ear)
  - **Function:** Sound amplification - acts as lever in ossicular chain
  - **Landmarks:** Long process, Short process
  - **Articulations:** Malleus, Stapes
  - **Innervation:** Facial nerve (VII)
- **Action:** ADD NEW BONE

---

#### [MISSING] Stapes
- **Key:** "Stapes" (NOT IN fetch-anatomical-data.ts)
- **Latin Name:** Stapes
- **Description:** "The 'stirrup'; the smallest bone in the human body. Its footplate occupies the oval window of the cochlea. It acts like a piston, pushing against the inner ear fluid to trigger the neural signals interpreted as sound."
- **Count:** 2 (Right, Left)
- **Metadata:**
  - **Bone Type:** Irregular (Smallest bone in body)
  - **Region:** Ear (Middle ear/Inner ear interface)
  - **Function:** Sound transmission to inner ear - acts as piston
  - **Landmarks:** Footplate, Head, Crura
  - **Articulations:** Incus, Oval window
  - **Innervation:** Facial nerve (VII)
  - **Size:** Smallest bone in human body
- **Action:** ADD NEW BONE

---

#### [MISSING] Hyoid Bone
- **Key:** "Hyoid" (NOT IN fetch-anatomical-data.ts)
- **Latin Name:** Os hyoideum
- **Description:** "A U-shaped bone in the anterior neck between the mandible and larynx. It is the only bone in the body that does not articulate with any other bone; it is suspended by muscles and ligaments. It serves as a movable base for the tongue and an attachment point for muscles that elevate the larynx during swallowing."
- **Count:** 1 (Unpaired)
- **Metadata:**
  - **Bone Type:** Irregular
  - **Region:** Neck
  - **Shape:** U-shaped (horseshoe-shaped)
  - **Function:** Tongue support, swallowing aid
  - **Special Feature:** ONLY bone not articulated with other bones - suspended by ligaments/muscles
  - **Landmarks:** Greater horns, Lesser horns, Body
  - **Articulations:** NONE (suspended by ligaments/muscles)
  - **Innervation:** Glossopharyngeal nerve (IX), Vagus nerve (X)
  - **Muscles:** Attached to swallowing muscles
- **Action:** ADD NEW BONE

---

## SECTION 2: VERTEBRAL COLUMN (26 BONES)

### [EXISTING] Cervical Vertebrae (7 bones)
All 7 cervical vertebrae are individually entered in COMPREHENSIVE_BONES as Vertebra_C1 through Vertebra_C7. They need description updates from comprehensive.txt:

**General Update for Cervical Group:**
- **Current:** Generic "First/Second/Third... cervical vertebra"
- **NEW:** "The seven vertebrae of the neck (C1–C7). Unique for their transverse foramina (passageways for vertebral arteries). C1 (Atlas) supports the skull and lacks a body; C2 (Axis) has the dens (odontoid process) which acts as a pivot for head rotation."
- **Action:** UPDATE all 7 cervical entries with transverse foramina details, atlas/axis special features

**Special Notes:**
- **Vertebra_C1 (Atlas):** Add "supports skull, lacks body, allows nodding"
- **Vertebra_C2 (Axis):** Add "dens (odontoid process) for head rotation"
- **Vertebra_C3-C7:** Standard cervical features

---

### [EXISTING] Thoracic Vertebrae (12 bones)
All 12 thoracic vertebrae are individually entered as Vertebra_T1 through Vertebra_T12. Need description updates:

**General Update for Thoracic Group:**
- **Current:** Generic descriptions with rib articulation
- **NEW:** "Twelve mid-back vertebrae (T1–T12). They feature costal facets on their bodies and transverse processes for rib articulation. They have long, downward-pointing spinous processes that limit over-extension, providing a stable anchor for the rib cage."
- **Action:** UPDATE all 12 thoracic entries with costal facet details, spinous process description

**Landmarks to Add:** Costal facets, Long spinous processes, Transverse facets for ribs

---

### [EXISTING] Lumbar Vertebrae (5 bones)
All 5 lumbar vertebrae are individually entered as Vertebra_L1 through Vertebra_L5. Need description updates:

**General Update for Lumbar Group:**
- **Current:** Generic "Largest of the lumbar vertebrae" 
- **NEW:** "The largest and thickest vertebrae (L1–L5) in the lower back. They lack costal facets and transverse foramina. Their massive, kidney-shaped bodies are designed to support the weight of the entire upper body and facilitate lifting and twisting."
- **Action:** UPDATE all 5 lumbar entries with kidney shape, weight-bearing focus, no costal facets

**Landmarks to Add:** Kidney-shaped bodies, Massive size, Weight-bearing role
**Metadata:** Lack costal facets, lack transverse foramina

---

### [EXISTING] Sacrum
- **Key:** "Sacrum"
- **Latin Name:** Os sacrum
- **Current Description:** "Large triangular bone formed by fusion of 5 sacral vertebrae. Base of the spine, articulates with pelvis."
- **NEW Description:** "A large, triangular bone formed by the fusion of five sacral vertebrae (S1–S5). It acts as a bridge between the spine and the pelvis via the sacroiliac (SI) joints. It contains the sacral canal (continuation of the vertebral canal) and sacral foramina for nerve exit."
- **Action:** UPDATE — Add bridge function, sacroiliac details, sacral canal, sacral foramina
- **Landmarks to Add:** Sacral canal, Sacral foramina, Sacroiliac joints
- **Function:** Bridge between spine and pelvis

---

### [EXISTING] Coccyx
- **Key:** "Coccyx"
- **Latin Name:** Os coccygis
- **Current Description:** "Small triangular bone formed by fusion of 3-5 coccygeal vertebrae at the base of spine."
- **NEW Description:** "The 'tailbone'; a small, triangular bone formed by the fusion of 3 to 5 rudimentary vertebrae. While it is a vestigial tail, it serves as a critical attachment point for the levator ani muscles and various ligaments that support the pelvic floor."
- **Action:** UPDATE — Add vestigial note, pelvic floor attachment, levator ani
- **Function:** Pelvic floor support
- **Attachments:** Levator ani muscles, Pelvic floor ligaments

---

## SECTION 3: THORACIC CAGE (25 BONES)

### [EXISTING] Sternum
- **Key:** "Sternum"
- **Latin Name:** Sternum
- **Current Description:** "Flat bone in center of chest connecting ribs and clavicles. Protects heart and lungs."
- **NEW Description:** "The 'breastbone'; a flat bone in the center of the chest. It consists of the manubrium (articulating with clavicles and 1st rib), the body (articulating with ribs 2-7), and the xiphoid process (cartilaginous in youth, ossifies in adults). It protects the heart and provides a central anchor for the rib cage."
- **Action:** UPDATE — Add parts (manubrium/body/xiphoid), articulation details, ossification note
- **Parts:** Manubrium, Body, Xiphoid process
- **Landmarks to Add:** Manubrium, Body, Xiphoid process, Sternal angle

---

### [EXISTING] Ribs (24 total - all individually entered)

All ribs (Rib_1_Right through Rib_12_Right and Rib_1_Left through Rib_12_Left) are individually entered. They need grouping descriptions updated:

#### TRUE RIBS (Ribs 1-7): 14 bones
- **Current Description (per rib):** "Shortest and most curved rib, articulates with T1 vertebra and sternum" (varies by number)
- **GROUP Description:** "Rib pairs 1 through 7. They articulate posteriorly with the thoracic vertebrae and attach anteriorly directly to the sternum via individual costal cartilages. This direct connection provides the rigidity needed to protect the heart and lungs."
- **Action:** UPDATE all Rib_1_Right through Rib_7_Right and Rib_1_Left through Rib_7_Left with direct sternum attachment, rigidity emphasis
- **Classification:** "True Rib"
- **Metadata:** Direct sternum attachment

#### FALSE RIBS (Ribs 8-10): 6 bones
- **Current Description:** Generic "Eighth rib, a false rib" format
- **GROUP Description:** "Rib pairs 8, 9, and 10. They articulate posteriorly with the vertebrae, but their anterior cartilages fuse together and attach to the cartilage of the 7th rib rather than the sternum directly. This allows for slightly more expansion during deep breathing."
- **Action:** UPDATE Rib_8_Right through Rib_10_Right and Rib_8_Left through Rib_10_Left with fused cartilage attachment, breathing expansion
- **Classification:** "False Rib"
- **Metadata:** Fused cartilage attachment to 7th rib

#### FLOATING RIBS (Ribs 11-12): 4 bones
- **Current Description:** Generic "Eleventh rib, floating rib" format
- **GROUP Description:** "Rib pairs 11 and 12. They articulate posteriorly with T11 and T12 vertebrae but have no anterior attachment. They are capped with cartilage and embedded in the abdominal wall, providing protection for the kidneys while allowing maximum torso flexibility."
- **Action:** UPDATE Rib_11_Right through Rib_12_Right and Rib_11_Left through Rib_12_Left with no anterior attachment, kidney protection, flexibility role
- **Classification:** "Floating Rib"
- **Metadata:** No anterior attachment, kidney protection

---

## SECTION 4: PECTORAL GIRDLE & UPPER LIMBS (64 BONES)

### [MISSING/PARTIAL] Clavicle
- **Key:** "Clavicle" (exists in BONE_SVG_ID_MAP but NOT in COMPREHENSIVE_BONES)
- **Latin Name:** Clavicula
- **Description from comprehensive.txt:** "The 'collarbone'; a doubly-curved long bone that serves as a horizontal strut connecting the upper limb to the axial skeleton. It articulates medially with the sternum (sternoclavicular joint) and laterally with the acromion of the scapula (acromioclavicular joint). It acts as a shock absorber and provides the only bony attachment between the trunk and the arm."
- **Count:** 2 (Right, Left)
- **Action:** ADD NEW — "ClavicleRight" and "ClavicleLeft"
- **Metadata:**
  - **Bone Type:** Long
  - **Function:** Shock absorption, force transmission, only bony trunk-arm connection
  - **Articulations:** Sternum (medially), Scapula acromion (laterally)
  - **Joints:** Sternoclavicular joint, Acromioclavicular joint
  - **Shape:** Doubly-curved (S-shaped)

---

### [EXISTING] Scapula
- **Key:** "ScapulaRight", "ScapulaLeft"
- **Latin Name:** Scapula
- **Current Description:** "Flat triangular bone on back of shoulder. Articulates with humerus and clavicle."
- **NEW Description:** "The 'shoulder blade'; a flat, triangular bone on the posterolateral aspect of the thorax (ribs 2-7). Key landmarks include the glenoid cavity (socket for the humerus), the acromion (the high point of the shoulder), and the coronoid process. It provides an expansive surface for the attachment of the rotator cuff muscles, facilitating complex shoulder mobility."
- **Action:** UPDATE — Add position (ribs 2-7), glenoid cavity, acromion, coronoid process, rotator cuff attachment
- **Landmarks to Add:** Glenoid cavity, Acromion process, Coracoid process, Scapular spine
- **Function:** Rotator cuff attachment, shoulder mobility

---

### [MISSING/PARTIAL] Humerus
- **Key:** "Humerus" (exists in BONE_SVG_ID_MAP but NOT in COMPREHENSIVE_BONES)
- **Latin Name:** Humerus
- **Description from comprehensive.txt:** "The longest and largest bone of the upper limb. Proximally, its smooth head fits into the glenoid cavity. Distally, it features the trochlea and capitulum for articulation with the ulna and radius at the elbow. Significant landmarks include the deltoid tuberosity for muscle attachment and the bicipital groove which houses the long head of the biceps tendon."
- **Count:** 2 (Right, Left)
- **Action:** ADD NEW — "HumerusRight" and "HumerusLeft"
- **Metadata:**
  - **Bone Type:** Long
  - **Region:** Upper limb
  - **Landmarks:** Smooth head, Trochlea, Capitulum, Deltoid tuberosity, Bicipital groove, Medial epicondyle, Lateral epicondyle
  - **Articulations:** Scapula (shoulder), Radius (elbow), Ulna (elbow)

---

### [MISSING/PARTIAL] Radius
- **Key:** "Radius" (exists in BONE_SVG_ID_MAP but NOT in COMPREHENSIVE_BONES)
- **Latin Name:** Radius
- **Description from comprehensive.txt:** "The lateral bone of the forearm, situated on the thumb side. Its disc-shaped head articulates with the humerus and the radial notch of the ulna. It is the primary bone involved in the wrist joint (radiocarpal joint). Its unique ability to pivot over the ulna allows for pronation (palm down) and supination (palm up)."
- **Count:** 2 (Right, Left)
- **Action:** ADD NEW — "RadiusRight" and "RadiusLeft"
- **Metadata:**
  - **Bone Type:** Long
  - **Region:** Upper limb (Forearm)
  - **Position:** Lateral (thumb side)
  - **Function:** Pronation/supination (pivots over ulna)
  - **Landmarks:** Disc-shaped head, Radial notch
  - **Articulations:** Humerus, Ulna, Carpals (wrist)
  - **Joints:** Radiocarpal joint (primary wrist involvement)

---

### [MISSING/PARTIAL] Ulna
- **Key:** "Ulna" (exists in BONE_SVG_ID_MAP but NOT in COMPREHENSIVE_BONES)
- **Latin Name:** Ulna
- **Description from comprehensive.txt:** "The medial bone of the forearm (pinky side). It is longer than the radius and acts as the stabilizing bone. Its hook-like olecranon process forms the bony point of the elbow and fits into the olecranon fossa of the humerus. It articulates with the radius proximally and distally but does not articulate directly with the carpal bones of the wrist."
- **Count:** 2 (Right, Left)
- **Action:** ADD NEW — "UlnaRight" and "UlnaLeft"
- **Metadata:**
  - **Bone Type:** Long
  - **Region:** Upper limb (Forearm)
  - **Position:** Medial (pinky side)
  - **Function:** Forearm stabilization
  - **Landmarks:** Olecranon process (elbow point), Olecranon fossa, Trochlear notch, Styloid process
  - **Articulations:** Humerus, Radius (proximal and distal)
  - **Special:** Does NOT articulate directly with carpals

---

### [MISSING] Carpal Bones (16 total - 8 per hand)
- **Count:** 16 bones (8 per wrist × 2 hands)
- **Latin Name:** Ossa carpi
- **Overview from comprehensive.txt:** "Eight small, irregular bones per wrist arranged in two rows. Proximal row: Scaphoid, Lunate, Triquetrum, Pisiform. Distal row: Trapezium, Trapezoid, Capitate, Hamate. These bones glide against one another to allow the wrist its multi-axial range of movement and provide a stable base for the metacarpals."
- **Action:** ADD NEW — 8 individual carpal entries per hand (Right/Left)

**Individual Carpals to Add:**

**Proximal Row (4 per hand × 2 = 8):**
1. **Scaphoid** (Navicular of carpus) — Most frequently fractured carpal
   - Position: Lateral (thumb side) of proximal row
   - Function: Wrist flexion/extension, lateral deviation
   
2. **Lunate** — Moon-shaped bone
   - Position: Central proximal row
   - Function: Wrist articulation, load transmission
   
3. **Triquetrum** (Triangular bone) — Three-cornered bone
   - Position: Medial (pinky side) of proximal row
   - Function: Wrist stability
   
4. **Pisiform** (Pea-shaped bone) — Smallest carpal
   - Position: Anteromedial proximal row (palmary aspect)
   - Function: Muscle attachment, not weight-bearing

**Distal Row (4 per hand × 2 = 8):**
1. **Trapezium** — Thumb-side carpal, articulates with thumb metacarpal
   - Position: Lateral (thumb side) of distal row
   - Function: Thumb opposition, complex thumb movements
   
2. **Trapezoid** — Small distal carpal
   - Position: Between trapezium and capitate
   - Function: Stabilization, hand arch
   
3. **Capitate** — Largest carpal bone, head-shaped
   - Position: Central distal row
   - Function: Central wrist stability, primary load-bearing
   
4. **Hamate** — Hook-shaped bone
   - Position: Medial (pinky side) of distal row
   - Landmark: Hamate hook (attachment for muscles/ligaments)
   - Function: Hand stability, muscle attachment

**Metadata for Carpal Set:**
- **Bone Type:** Irregular/Short
- **Region:** Hand/Wrist
- **Function:** Multi-axial wrist movement, stable base for metacarpals
- **Arrangement:** Two rows (proximal/distal)
- **Total per hand:** 8 bones
- **Special feature:** Glide against each other for complex wrist motion

---

### [MISSING] Metacarpals (10 total - 5 per hand)
- **Count:** 10 bones (5 per hand × 2)
- **Latin Name:** Ossa metacarpi
- **Description from comprehensive.txt:** "Five miniature long bones per hand forming the framework of the palm. They are numbered 1 (thumb) to 5 (pinky). Each consists of a base (proximal), a shaft, and a head (distal), the latter of which forms the 'knuckles' when the hand is clenched. They provide the structural span between the wrist and the fingers."
- **Action:** ADD NEW — 5 individual metacarpal entries per hand (Right/Left)

**Individual Metacarpals to Add (per hand):**
1. **Metacarpal 1** (Thumb)
2. **Metacarpal 2** (Index finger)
3. **Metacarpal 3** (Middle finger)
4. **Metacarpal 4** (Ring finger)
5. **Metacarpal 5** (Pinky finger)

**Metadata per Metacarpal:**
- **Bone Type:** Long
- **Structure:** Base (proximal) → Shaft → Head (distal/knuckles)
- **Parts:** Base, Shaft, Head
- **Function:** Palm framework, finger support
- **Landmarks:** Metacarpal head (knuckle), Base, Shaft

---

### [MISSING] Phalanges - Hand (28 total - 14 per hand)
- **Count:** 28 bones (14 per hand × 2)
- **Latin Name:** Phalanges digitorum manus
- **Description from comprehensive.txt:** "The bones of the fingers. Each finger (2-5) contains three phalanges: proximal, middle, and distal. The thumb (pollex) contains only two: proximal and distal. These bones provide the leverage needed for both 'power grips' and the 'precision grip' required for fine motor tasks."
- **Action:** ADD NEW — 14 individual phalanx entries per hand (Right/Left)

**Phalanges per Hand (14 total):**
- **Thumb (Pollex):** 2 phalanges × 1 = 2
  - Proximal phalanx
  - Distal phalanx
  
- **Fingers 2-5:** 3 phalanges each × 4 = 12
  - Each finger: Proximal phalanx → Middle (intermediate) phalanx → Distal phalanx

**Naming Convention per hand (Right/Left):**
- Phalanx_Thumb_P1_Right, Phalanx_Thumb_D_Right
- Phalanx_Index_P1_Right, Phalanx_Index_M_Right, Phalanx_Index_D_Right
- Phalanx_Middle_P1_Right, Phalanx_Middle_M_Right, Phalanx_Middle_D_Right
- Phalanx_Ring_P1_Right, Phalanx_Ring_M_Right, Phalanx_Ring_D_Right
- Phalanx_Pinky_P1_Right, Phalanx_Pinky_M_Right, Phalanx_Pinky_D_Right

**Metadata per Phalanx:**
- **Bone Type:** Long
- **Function:** Finger structure, grip (power and precision), fine motor control
- **Position Codes:** P1 (Proximal), M (Middle/Intermediate), D (Distal)

---

## SECTION 5: PELVIC GIRDLE & LOWER LIMBS (62 BONES)

### [EXISTING] Hip Bone (Os coxae)
- **Key:** "Hip Bone" (composed of Ilium, Ischium, Pubis in fetch-anatomical-data.ts)
- **Latin Name:** Os coxae (Coxal bone, Pelvic bone, Innominate bone)
- **Description from comprehensive.txt:** "Also called the coxal or pelvic bone; a large, irregular bone formed by the fusion of the Ilium (superior flare), Ischium (inferior posterior 'sit bone'), and Pubis (anterior). The three meet at the acetabulum, the deep socket for the femur. The two hip bones articulate anteriorly at the pubic symphysis and posteriorly with the sacrum to form the bony pelvis."
- **Status:** EXISTING but NEEDS GROUP DESCRIPTION
- **Components:** Ilium, Ischium, Pubis (all 3 exist in COMPREHENSIVE_BONES)
- **Action:** ADD GROUP description; update individual components with full detail

**Hip Bone Components (all EXISTING):**

#### Ilium
- **Current:** "Largest part of the os coxa (hip bone)"
- **NEW:** Large, wing-shaped superior portion forming the lateral flare
- **Landmarks:** Anterior superior iliac spine (ASIS), Iliac crest, Posterior superior iliac spine (PSIS)

#### Ischium
- **Current:** "Lower and posterior part of the os coxa"
- **NEW:** Posterior inferior portion forming the "sit bones"
- **Landmarks:** Ischial tuberosity (sitting bone), Ischial spine

#### Pubis
- **Current:** "Anterior and inferior part of the os coxa"
- **NEW:** Anterior inferior portion forming the pubic symphysis
- **Landmarks:** Pubic crest, Pubic tubercle

**Group Metadata:**
- **Combined Function:** Pelvic girdle formation, weight support, organ protection
- **Central Feature:** Acetabulum (hip socket for femur)
- **Articulations:** Sacroiliac joints (posterior), Pubic symphysis (anterior), Femoral head
- **Gender Differences:** Female pelvis wider, acetabulum faces more anteriorly

---

### [MISSING/PARTIAL] Femur
- **Key:** "Femur" (exists in BONE_SVG_ID_MAP but NOT in COMPREHENSIVE_BONES)
- **Latin Name:** Femur
- **Description from comprehensive.txt:** "The thigh bone; the longest, heaviest, and strongest bone in the body. Its spherical head fits into the acetabulum, while its neck—a common site for fractures—projects the shaft laterally. Distally, the medial and lateral condyles articulate with the tibia and patella. It is the primary load-bearing bone of the lower body."
- **Count:** 2 (Right, Left)
- **Action:** ADD NEW — "FemurRight" and "FemurLeft"
- **Metadata:**
  - **Bone Type:** Long
  - **Significance:** Longest, heaviest, strongest bone in body
  - **Landmarks:** Spherical head, Neck (fracture site), Shaft, Medial condyle, Lateral condyle, Greater trochanter, Lesser trochanter
  - **Function:** Load-bearing, primary weight support
  - **Articulations:** Acetabulum (hip), Tibia (knee), Patella (knee)

---

### [MISSING/PARTIAL] Patella
- **Key:** "Patella" (exists in BONE_SVG_ID_MAP but NOT in COMPREHENSIVE_BONES)
- **Latin Name:** Patella
- **Description from comprehensive.txt:** "The 'kneecap'; a large, flat sesamoid bone triangular in shape. It is situated within the quadriceps femoris tendon and articulates with the patellar surface of the femur. Its primary function is to increase the mechanical advantage (leverage) of the quadriceps muscle during leg extension and to protect the knee joint."
- **Count:** 2 (Right, Left)
- **Action:** ADD NEW — "PatellaRight" and "PatellaLeft"
- **Metadata:**
  - **Bone Type:** Sesamoid (unique classification)
  - **Shape:** Triangular
  - **Function:** Mechanical advantage (leverage), knee protection
  - **Embedding:** Embedded in quadriceps femoris tendon
  - **Articulation:** Patellar surface of femur
  - **Landmarks:** Apex (inferior), Base (superior)

---

### [MISSING/PARTIAL] Tibia
- **Key:** "Tibia" (exists in BONE_SVG_ID_MAP but NOT in COMPREHENSIVE_BONES)
- **Latin Name:** Tibia
- **Description from comprehensive.txt:** "The 'shinbone'; the second-longest bone in the body and the primary weight-bearing bone of the lower leg. It articulates proximally with the femoral condyles to form the knee and distally with the talus to form the ankle. Its medial malleolus forms the inner prominence of the ankle."
- **Count:** 2 (Right, Left)
- **Action:** ADD NEW — "TibiaRight" and "TibiaLeft"
- **Metadata:**
  - **Bone Type:** Long
  - **Significance:** Second-longest bone, primary weight-bearing of lower leg
  - **Landmarks:** Tibial plateau (proximal), Medial malleolus (inner ankle), Tibial tuberosity (knee attachment), Tibial shaft
  - **Articulations:** Femur (proximal/knee), Talus (distal/ankle), Fibula
  - **Function:** Weight-bearing, knee/ankle formation

---

### [MISSING/PARTIAL] Fibula
- **Key:** "Fibula" (exists in BONE_SVG_ID_MAP but NOT in COMPREHENSIVE_BONES)
- **Latin Name:** Fibula
- **Description from comprehensive.txt:** "A slender, non-weight-bearing bone on the lateral side of the tibia. Its proximal head does not reach the knee joint, but its distal end, the lateral malleolus, forms the outer prominence of the ankle and provides critical lateral stability to the talocrural (ankle) joint. It serves as a major origin point for leg muscles."
- **Count:** 2 (Right, Left)
- **Action:** ADD NEW — "FibulaRight" and "FibulaLeft"
- **Metadata:**
  - **Bone Type:** Long
  - **Significance:** Non-weight-bearing but critical for stability
  - **Position:** Lateral to tibia
  - **Landmarks:** Fibular head (proximal), Lateral malleolus (outer ankle), Fibular shaft
  - **Function:** Ankle stability, muscle attachment
  - **Articulations:** Tibia (proximal and distal)
  - **Special:** Proximal head does not reach knee joint

---

### [MISSING] Tarsal Bones (14 total - 7 per foot)
- **Count:** 14 bones (7 per foot × 2)
- **Latin Name:** Ossa tarsi
- **Description from comprehensive.txt:** "Seven bones per ankle/foot: Talus (articulates with tibia), Calcaneus (the heel bone), Navicular, Cuboid, and three Cuneiforms (medial, intermediate, lateral). These bones are larger and stronger than carpals to support the body's entire weight and facilitate the distribution of force during walking."
- **Action:** ADD NEW — 7 individual tarsal entries per foot (Right/Left)

**Individual Tarsals per Foot (7 total):**

1. **Talus** (Ankle bone)
   - Position: Superior (articulates with tibia/fibula)
   - Function: Bridge between leg and foot, weight transmission
   - Landmark: Talar head
   
2. **Calcaneus** (Heel bone)
   - Position: Posterior-inferior
   - Function: Heel cushioning, weight support
   - Landmark: Calcaneal tuberosity
   - Special: Largest tarsal bone
   
3. **Navicular** (Boat-shaped)
   - Position: Medial, anterior to talus
   - Function: Foot arch support
   - Landmark: Navicular tuberosity
   
4. **Cuboid** (Cube-shaped)
   - Position: Lateral, anterior to calcaneus
   - Function: Lateral foot support, 5th metatarsal articulation
   
5. **Cuneiforms - Medial** (First cuneiform)
   - Position: Medial, anterior (1st metatarsal)
   - Function: Great toe support, arch participation
   
6. **Cuneiforms - Intermediate** (Second cuneiform)
   - Position: Middle anterior
   - Function: Foot arch formation
   
7. **Cuneiforms - Lateral** (Third cuneiform)
   - Position: Lateral anterior
   - Function: Foot stability, lateral arch

**Metadata for Tarsal Set:**
- **Bone Type:** Short/Irregular
- **Region:** Foot/Ankle
- **Function:** Weight support, load distribution, foot arches
- **Total per foot:** 7 bones
- **Special feature:** Larger and stronger than carpals (weight-bearing)

---

### [MISSING] Metatarsals (10 total - 5 per foot)
- **Count:** 10 bones (5 per foot × 2)
- **Latin Name:** Ossa metatarsi
- **Description from comprehensive.txt:** "Five bones forming the arch and midfoot. Like the hand, they are numbered 1 (big toe) to 5. The first metatarsal is significantly thicker as it plays a major role in the 'toe-off' phase of walking. They provide the structural bridge between the ankle and the toes."
- **Action:** ADD NEW — 5 individual metatarsal entries per foot (Right/Left)

**Individual Metatarsals per Foot (5 total):**
1. **Metatarsal 1** (Big toe/Hallux) — THICKER, greater weight-bearing
2. **Metatarsal 2** (2nd toe)
3. **Metatarsal 3** (3rd toe)
4. **Metatarsal 4** (4th toe)
5. **Metatarsal 5** (5th toe/Pinky toe)

**Metadata per Metatarsal:**
- **Bone Type:** Long
- **Function:** Foot arch, weight distribution, walking propulsion
- **Structure:** Base (proximal), Shaft, Head (distal)
- **Special for MT1:** Thicker, major toe-off phase participation

---

### [MISSING] Phalanges - Foot (28 total - 14 per foot)
- **Count:** 28 bones (14 per foot × 2)
- **Latin Name:** Phalanges digitorum pedis
- **Description from comprehensive.txt:** "The bones of the toes. The big toe (hallux) has two phalanges: proximal and distal. The other four toes have three: proximal, middle, and distal. While smaller than those in the hand, they are vital for maintaining balance and providing propulsion during the gait cycle."
- **Action:** ADD NEW — 14 individual phalanx entries per foot (Right/Left)

**Phalanges per Foot (14 total):**
- **Big Toe (Hallux):** 2 phalanges × 1 = 2
  - Proximal phalanx
  - Distal phalanx
  
- **Toes 2-5:** 3 phalanges each × 4 = 12
  - Each toe: Proximal phalanx → Middle (intermediate) phalanx → Distal phalanx

**Naming Convention per foot (Right/Left):**
- Phalanx_BigToe_P1_Right, Phalanx_BigToe_D_Right
- Phalanx_Toe2_P1_Right, Phalanx_Toe2_M_Right, Phalanx_Toe2_D_Right
- Phalanx_Toe3_P1_Right, Phalanx_Toe3_M_Right, Phalanx_Toe3_D_Right
- Phalanx_Toe4_P1_Right, Phalanx_Toe4_M_Right, Phalanx_Toe4_D_Right
- Phalanx_Toe5_P1_Right, Phalanx_Toe5_M_Right, Phalanx_Toe5_D_Right

**Metadata per Phalanx:**
- **Bone Type:** Long
- **Function:** Toe structure, balance maintenance, gait propulsion
- **Position Codes:** P1 (Proximal), M (Middle/Intermediate), D (Distal)

---

## SUMMARY TABLE: CHANGES REQUIRED

| Category | Status | Count | Action |
|----------|--------|-------|--------|
| **EXISTING - Description Update Only** | UPDATE | ~30-35 | Enhanced descriptions from comprehensive.txt |
| **Missing Auditory Ossicles** | ADD | 7 | Malleus(2), Incus(2), Stapes(2), Hyoid(1) |
| **Missing Long Bones** | ADD | 10 | Clavicle(2), Humerus(2), Radius(2), Ulna(2), Femur(2), Patella(2), Tibia(2), Fibula(2) |
| **Missing Hand Bones** | ADD | 54 | Carpals(16), Metacarpals(10), Phalanges(28) |
| **Missing Foot Bones** | ADD | 52 | Tarsals(14), Metatarsals(10), Phalanges(28) |
| **TOTAL MISSING/NEW** | ADD | ~125-130 | New entries for fetch-anatomical-data.ts |

---

## IMPLEMENTATION PRIORITY

### Phase 1: Critical Additions (Must do first)
1. Auditory ossicles (7 bones) - Malleus, Incus, Stapes, Hyoid
2. Long limb bones (10 bones) - Clavicle through Fibula pairs

### Phase 2: Limb Individual Bones
3. Hand bones (54 bones) - Carpals, Metacarpals, Phalanges
4. Foot bones (52 bones) - Tarsals, Metatarsals, Phalanges

### Phase 3: Descriptions & Metadata
5. Update 30-35 existing bone descriptions
6. Add detailed landmarks and articulations
7. Add metadata for bone type, region, function

---

## NOTES

- **Mandible:** Currently MISSING from COMPREHENSIVE_BONES despite being critical skull bone. Must add before deploying database.
- **Hyoid:** Unique bone - only bone not articulated with other bones, suspended by ligaments/muscles.
- **Right/Left Consistency:** All paired bones should have Right/Left variants for SVG mapping.
- **Carpal/Tarsal Individual Entries:** Can be added as individual bones or kept as grouped. Currently grouped; individual entries provide more detail.
- **Database Rebuild:** After all additions, run: `npm run fetch-anatomy && npm run generate-bones && npm run seed && npm run embed && npm run verify:db`
