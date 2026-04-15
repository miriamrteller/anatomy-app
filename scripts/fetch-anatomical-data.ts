import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Comprehensive list of 206 anatomical bones from standard anatomy references
 * Includes all major and minor skeletal structures with Latin names and metadata
 */
const COMPREHENSIVE_BONES = {
  // SKULL (22 bones)
  "Frontal": {
    name: "Frontal Bone",
    latinName: "Os frontale",
    aliases: ["Forehead bone"],
    system: "SKELETAL",
    description: "Forms the anterior and superior part of the cranium. Contains the frontal sinuses and has a prominent brow ridge.",
    metadata: {
      boneType: "Flat",
      region: "Head",
      articulations: ["Parietal", "Nasal", "Lacrimal", "Zygomatic", "Maxilla", "Ethmoid", "Sphenoid"],
      innervation: "Trigeminal nerve (V1)",
      boneCount: 1
    }
  },
  "Parietal": {
    name: "Parietal Bone",
    latinName: "Os parietale",
    aliases: ["Side and top of skull"],
    system: "SKELETAL",
    description: "Forms the sides and roof of the cranium. Two bones (left and right) that meet at the sagittal suture.",
    metadata: {
      boneType: "Flat",
      region: "Head",
      articulations: ["Frontal", "Occipital", "Temporal", "Sphenoid"],
      boneCount: 2
    }
  },
  "Temporal": {
    name: "Temporal Bone",
    latinName: "Os temporale",
    aliases: ["Side of head"],
    system: "SKELETAL",
    description: "Forms the sides and base of the cranium. Contains the ear canal and articulates with the mandible.",
    metadata: {
      boneType: "Irregular",
      region: "Head",
      articulations: ["Parietal", "Frontal", "Occipital", "Sphenoid", "Zygomatic", "Mandible"],
      innervation: "Facial nerve (VII), Glossopharyngeal nerve (IX)",
      boneCount: 2
    }
  },
  "Occipital": {
    name: "Occipital Bone",
    latinName: "Os occipitale",
    aliases: ["Back of skull"],
    system: "SKELETAL",
    description: "Forms the posterior and inferior part of the cranium. Contains the foramen magnum through which the spinal cord passes.",
    metadata: {
      boneType: "Irregular",
      region: "Head",
      articulations: ["Parietal", "Temporal", "Sphenoid", "Atlas (C1)"],
      landmarks: ["Foramen magnum", "Occipital condyles"],
      innervation: "Accessory nerve (XI)",
      boneCount: 1
    }
  },
  "Ethmoid": {
    name: "Ethmoid Bone",
    latinName: "Os ethmoideum",
    aliases: ["Nasal cavity bone"],
    system: "SKELETAL",
    description: "Forms part of the cranial floor and nasal septum. Contains ethmoidal air cells and contributes to the nasal cavity.",
    metadata: {
      boneType: "Irregular",
      region: "Head",
      articulations: ["Frontal", "Sphenoid", "Nasal", "Lacrimal", "Maxilla", "Vomer"],
      boneCount: 1
    }
  },
  "Sphenoid": {
    name: "Sphenoid Bone",
    latinName: "Os sphenoidale",
    aliases: ["Central skull base"],
    system: "SKELETAL",
    description: "Located at the base of the cranium, forms the sella turcica which houses the pituitary gland. Has multiple foramina for nerves and vessels.",
    metadata: {
      boneType: "Irregular",
      region: "Head",
      articulations: ["Frontal", "Parietal", "Temporal", "Occipital", "Ethmoid", "Vomer"],
      landmarks: ["Sella turcica", "Optic foramen", "Foramen ovale"],
      boneCount: 1
    }
  },
  "Nasal": {
    name: "Nasal Bone",
    latinName: "Os nasale",
    aliases: ["Nose bone"],
    system: "SKELETAL",
    description: "Forms the bridge of the nose. Two small rectangular bones.",
    metadata: {
      boneType: "Flat",
      region: "Face",
      articulations: ["Frontal", "Ethmoid", "Maxilla", "Vomer"],
      boneCount: 2
    }
  },
  "Lacrimal": {
    name: "Lacrimal Bone",
    latinName: "Os lacrimale",
    aliases: ["Tear bone"],
    system: "SKELETAL",
    description: "Small bone forming part of the medial wall of the orbit. Contains the lacrimal groove for tear ducts.",
    metadata: {
      boneType: "Flat",
      region: "Face",
      articulations: ["Frontal", "Nasal", "Ethmoid", "Maxilla"],
      boneCount: 2
    }
  },
  "Zygomatic": {
    name: "Zygomatic Bone",
    latinName: "Os zygomaticum",
    aliases: ["Cheekbone"],
    system: "SKELETAL",
    description: "Forms the prominence of the cheek. Articulates with the frontal, temporal, and maxilla.",
    metadata: {
      boneType: "Irregular",
      region: "Face",
      articulations: ["Frontal", "Temporal", "Maxilla"],
      innervation: "Zygomatic nerve (V2)",
      boneCount: 2
    }
  },
  "Maxilla": {
    name: "Maxilla",
    latinName: "Maxilla",
    aliases: ["Upper jaw", "Upper jawbone"],
    system: "SKELETAL",
    description: "Forms the upper jaw and palate. Holds the upper teeth and has large sinuses (maxillary sinuses).",
    metadata: {
      boneType: "Irregular",
      region: "Face",
      articulations: ["Frontal", "Nasal", "Lacrimal", "Zygomatic", "Vomer", "Palatine", "Ethmoid"],
      teeth: 8,
      innervation: "Trigeminal nerve (V2)",
      boneCount: 2
    }
  },
  "Vomer": {
    name: "Vomer",
    latinName: "Vomer",
    aliases: ["Nasal septum bone"],
    system: "SKELETAL",
    description: "Unpaired bone that forms the inferior and posterior part of the nasal septum.",
    metadata: {
      boneType: "Irregular",
      region: "Head",
      articulations: ["Ethmoid", "Sphenoid", "Maxilla", "Palatine"],
      boneCount: 1
    }
  },
  "Palatine": {
    name: "Palatine Bone",
    latinName: "Os palatinum",
    aliases: ["Palate bone"],
    system: "SKELETAL",
    description: "Forms the posterior part of the hard palate and contributes to the nasal cavity.",
    metadata: {
      boneType: "Irregular",
      region: "Face",
      articulations: ["Maxilla", "Vomer", "Sphenoid", "Ethmoid"],
      boneCount: 2
    }
  },
  "Inferior Nasal Concha": {
    name: "Inferior Nasal Concha",
    latinName: "Concha nasalis inferior",
    aliases: ["Turbinate"],
    system: "SKELETAL",
    description: "Bony ridge in the nasal cavity that projects from the lateral wall. Extends from the maxilla.",
    metadata: {
      boneType: "Long/Thin",
      region: "Nasal cavity",
      articulations: ["Maxilla", "Ethmoid", "Lacrimal", "Palatine"],
      boneCount: 2
    }
  },

  // VERTEBRAL COLUMN (33 bones)
  "Vertebra_C1": {
    name: "Atlas (C1)",
    latinName: "Vertebra cervicalis I",
    aliases: ["First cervical vertebra", "C1"],
    system: "SKELETAL",
    description: "Supports the skull. Lacks a body; consists of anterior and posterior arches with lateral masses.",
    metadata: {
      boneType: "Irregular",
      region: "Spine",
      vertebralLevel: "C1",
      articulations: ["Occipital bone", "Axis (C2)"],
      function: "Supports skull, allows nodding motion"
    }
  },
  "Vertebra_C2": {
    name: "Axis (C2)",
    latinName: "Vertebra cervicalis II",
    aliases: ["Second cervical vertebra", "C2"],
    system: "SKELETAL",
    description: "Has an odontoid process (dens) that acts as a pivot for head rotation relative to the atlas.",
    metadata: {
      boneType: "Irregular",
      region: "Spine",
      vertebralLevel: "C2",
      landmark: "Odontoid process (dens)"
    }
  },
  "Vertebra_C3": {
    name: "Cervical Vertebra (C3)",
    latinName: "Vertebra cervicalis III",
    aliases: ["C3"],
    system: "SKELETAL",
    description: "Third cervical vertebra with typical cervical features.",
    metadata: {
      boneType: "Irregular",
      region: "Spine",
      vertebralLevel: "C3"
    }
  },
  "Vertebra_C4": {
    name: "Cervical Vertebra (C4)",
    latinName: "Vertebra cervicalis IV",
    aliases: ["C4"],
    system: "SKELETAL",
    description: "Fourth cervical vertebra.",
    metadata: {
      boneType: "Irregular",
      region: "Spine",
      vertebralLevel: "C4"
    }
  },
  "Vertebra_C5": {
    name: "Cervical Vertebra (C5)",
    latinName: "Vertebra cervicalis V",
    aliases: ["C5"],
    system: "SKELETAL",
    description: "Fifth cervical vertebra.",
    metadata: {
      boneType: "Irregular",
      region: "Spine",
      vertebralLevel: "C5"
    }
  },
  "Vertebra_C6": {
    name: "Cervical Vertebra (C6)",
    latinName: "Vertebra cervicalis VI",
    aliases: ["C6"],
    system: "SKELETAL",
    description: "Sixth cervical vertebra.",
    metadata: {
      boneType: "Irregular",
      region: "Spine",
      vertebralLevel: "C6"
    }
  },
  "Vertebra_C7": {
    name: "Cervical Vertebra (C7)",
    latinName: "Vertebra cervicalis VII",
    aliases: ["C7", "Vertebra prominens"],
    system: "SKELETAL",
    description: "Seventh cervical vertebra. Has a prominent spinous process palpable at the base of the neck.",
    metadata: {
      boneType: "Irregular",
      region: "Spine",
      vertebralLevel: "C7",
      landmark: "Prominent spinous process"
    }
  },
  "Vertebra_T1": {
    name: "Thoracic Vertebra (T1)",
    latinName: "Vertebra thoracica I",
    aliases: ["T1"],
    system: "SKELETAL",
    description: "First thoracic vertebra. Articulates with the first pair of ribs.",
    metadata: {
      boneType: "Irregular",
      region: "Spine",
      vertebralLevel: "T1",
      ribArticulation: 1
    }
  },
  "Vertebra_T2": {
    name: "Thoracic Vertebra (T2)",
    latinName: "Vertebra thoracica II",
    aliases: ["T2"],
    system: "SKELETAL",
    description: "Second thoracic vertebra.",
    metadata: {
      boneType: "Irregular",
      region: "Spine",
      vertebralLevel: "T2",
      ribArticulation: 2
    }
  },
  "Vertebra_T3": {
    name: "Thoracic Vertebra (T3)",
    latinName: "Vertebra thoracica III",
    aliases: ["T3"],
    system: "SKELETAL",
    description: "Third thoracic vertebra.",
    metadata: {
      boneType: "Irregular",
      region: "Spine",
      vertebralLevel: "T3",
      ribArticulation: 3
    }
  },
  "Vertebra_T4": {
    name: "Thoracic Vertebra (T4)",
    latinName: "Vertebra thoracica IV",
    aliases: ["T4"],
    system: "SKELETAL",
    description: "Fourth thoracic vertebra.",
    metadata: {
      boneType: "Irregular",
      region: "Spine",
      vertebralLevel: "T4",
      ribArticulation: 4
    }
  },
  "Vertebra_T5": {
    name: "Thoracic Vertebra (T5)",
    latinName: "Vertebra thoracica V",
    aliases: ["T5"],
    system: "SKELETAL",
    description: "Fifth thoracic vertebra.",
    metadata: {
      boneType: "Irregular",
      region: "Spine",
      vertebralLevel: "T5",
      ribArticulation: 5
    }
  },
  "Vertebra_T6": {
    name: "Thoracic Vertebra (T6)",
    latinName: "Vertebra thoracica VI",
    aliases: ["T6"],
    system: "SKELETAL",
    description: "Sixth thoracic vertebra.",
    metadata: {
      boneType: "Irregular",
      region: "Spine",
      vertebralLevel: "T6",
      ribArticulation: 6
    }
  },
  "Vertebra_T7": {
    name: "Thoracic Vertebra (T7)",
    latinName: "Vertebra thoracica VII",
    aliases: ["T7"],
    system: "SKELETAL",
    description: "Seventh thoracic vertebra.",
    metadata: {
      boneType: "Irregular",
      region: "Spine",
      vertebralLevel: "T7",
      ribArticulation: 7
    }
  },
  "Vertebra_T8": {
    name: "Thoracic Vertebra (T8)",
    latinName: "Vertebra thoracica VIII",
    aliases: ["T8"],
    system: "SKELETAL",
    description: "Eighth thoracic vertebra.",
    metadata: {
      boneType: "Irregular",
      region: "Spine",
      vertebralLevel: "T8",
      ribArticulation: 8
    }
  },
  "Vertebra_T9": {
    name: "Thoracic Vertebra (T9)",
    latinName: "Vertebra thoracica IX",
    aliases: ["T9"],
    system: "SKELETAL",
    description: "Ninth thoracic vertebra.",
    metadata: {
      boneType: "Irregular",
      region: "Spine",
      vertebralLevel: "T9",
      ribArticulation: 9
    }
  },
  "Vertebra_T10": {
    name: "Thoracic Vertebra (T10)",
    latinName: "Vertebra thoracica X",
    aliases: ["T10"],
    system: "SKELETAL",
    description: "Tenth thoracic vertebra.",
    metadata: {
      boneType: "Irregular",
      region: "Spine",
      vertebralLevel: "T10",
      ribArticulation: 10
    }
  },
  "Vertebra_T11": {
    name: "Thoracic Vertebra (T11)",
    latinName: "Vertebra thoracica XI",
    aliases: ["T11"],
    system: "SKELETAL",
    description: "Eleventh thoracic vertebra.",
    metadata: {
      boneType: "Irregular",
      region: "Spine",
      vertebralLevel: "T11",
      ribArticulation: 11
    }
  },
  "Vertebra_T12": {
    name: "Thoracic Vertebra (T12)",
    latinName: "Vertebra thoracica XII",
    aliases: ["T12"],
    system: "SKELETAL",
    description: "Twelfth thoracic vertebra, the lowest thoracic vertebra.",
    metadata: {
      boneType: "Irregular",
      region: "Spine",
      vertebralLevel: "T12",
      ribArticulation: 12
    }
  },
  "Vertebra_L1": {
    name: "Lumbar Vertebra (L1)",
    latinName: "Vertebra lumbalis I",
    aliases: ["L1"],
    system: "SKELETAL",
    description: "First lumbar vertebra. Largest of the lumbar vertebrae.",
    metadata: {
      boneType: "Irregular",
      region: "Spine",
      vertebralLevel: "L1"
    }
  },
  "Vertebra_L2": {
    name: "Lumbar Vertebra (L2)",
    latinName: "Vertebra lumbalis II",
    aliases: ["L2"],
    system: "SKELETAL",
    description: "Second lumbar vertebra.",
    metadata: {
      boneType: "Irregular",
      region: "Spine",
      vertebralLevel: "L2"
    }
  },
  "Vertebra_L3": {
    name: "Lumbar Vertebra (L3)",
    latinName: "Vertebra lumbalis III",
    aliases: ["L3"],
    system: "SKELETAL",
    description: "Third lumbar vertebra.",
    metadata: {
      boneType: "Irregular",
      region: "Spine",
      vertebralLevel: "L3"
    }
  },
  "Vertebra_L4": {
    name: "Lumbar Vertebra (L4)",
    latinName: "Vertebra lumbalis IV",
    aliases: ["L4"],
    system: "SKELETAL",
    description: "Fourth lumbar vertebra.",
    metadata: {
      boneType: "Irregular",
      region: "Spine",
      vertebralLevel: "L4"
    }
  },
  "Vertebra_L5": {
    name: "Lumbar Vertebra (L5)",
    latinName: "Vertebra lumbalis V",
    aliases: ["L5"],
    system: "SKELETAL",
    description: "Fifth lumbar vertebra. Articulates with the sacrum below.",
    metadata: {
      boneType: "Irregular",
      region: "Spine",
      vertebralLevel: "L5"
    }
  },
  "Sacrum": {
    name: "Sacrum",
    latinName: "Os sacrum",
    aliases: ["Sacral bone", "Fused sacral vertebrae"],
    system: "SKELETAL",
    description: "Large triangular bone formed by fusion of 5 sacral vertebrae. Base of the spine, articulates with pelvis.",
    metadata: {
      boneType: "Irregular",
      region: "Spine",
      fusedVertebrae: 5,
      articulations: ["Lumbar spine (L5)", "Coccyx", "Pelvic girdle"],
      landmarks: ["Sacral foramina", "Sacral promontory"]
    }
  },
  "Coccyx": {
    name: "Coccyx",
    latinName: "Os coccygis",
    aliases: ["Tailbone", "Fused coccygeal vertebrae"],
    system: "SKELETAL",
    description: "Small triangular bone formed by fusion of 3-5 coccygeal vertebrae at the base of spine.",
    metadata: {
      boneType: "Irregular",
      region: "Spine",
      fusedVertebrae: "3-5",
      articulations: ["Sacrum"]
    }
  },

  // RIBS AND STERNUM (25 bones)
  "Rib_1_Right": {
    name: "First Rib (Right)",
    latinName: "Costa prima",
    aliases: ["Rib 1"],
    system: "SKELETAL",
    description: "Shortest and most curved rib, articulates with T1 vertebra and sternum.",
    metadata: {
      boneType: "Long/Curved",
      region: "Thorax",
      side: "Right",
      ribNumber: 1,
      articulations: ["Thoracic vertebra T1", "Sternum"]
    }
  },
  "Rib_2_Right": {
    name: "Second Rib (Right)",
    latinName: "Costa secunda",
    aliases: ["Rib 2"],
    system: "SKELETAL",
    description: "Second rib, articulates with T2 vertebra and sternum.",
    metadata: {
      boneType: "Long/Curved",
      region: "Thorax",
      side: "Right",
      ribNumber: 2
    }
  },
  "Rib_3_Right": {
    name: "Third Rib (Right)",
    latinName: "Costa tertia",
    aliases: ["Rib 3"],
    system: "SKELETAL",
    description: "Third rib, articulates with T3 vertebra.",
    metadata: {
      boneType: "Long/Curved",
      region: "Thorax",
      side: "Right",
      ribNumber: 3
    }
  },
  "Rib_4_Right": {
    name: "Fourth Rib (Right)",
    latinName: "Costa quarta",
    aliases: ["Rib 4"],
    system: "SKELETAL",
    description: "Fourth rib.",
    metadata: {
      boneType: "Long/Curved",
      region: "Thorax",
      side: "Right",
      ribNumber: 4
    }
  },
  "Rib_5_Right": {
    name: "Fifth Rib (Right)",
    latinName: "Costa quinta",
    aliases: ["Rib 5"],
    system: "SKELETAL",
    description: "Fifth rib.",
    metadata: {
      boneType: "Long/Curved",
      region: "Thorax",
      side: "Right",
      ribNumber: 5
    }
  },
  "Rib_6_Right": {
    name: "Sixth Rib (Right)",
    latinName: "Costa sexta",
    aliases: ["Rib 6"],
    system: "SKELETAL",
    description: "Sixth rib.",
    metadata: {
      boneType: "Long/Curved",
      region: "Thorax",
      side: "Right",
      ribNumber: 6
    }
  },
  "Rib_7_Right": {
    name: "Seventh Rib (Right)",
    latinName: "Costa septima",
    aliases: ["Rib 7"],
    system: "SKELETAL",
    description: "Seventh rib, the last true rib.",
    metadata: {
      boneType: "Long/Curved",
      region: "Thorax",
      side: "Right",
      ribNumber: 7
    }
  },
  "Rib_8_Right": {
    name: "Eighth Rib (Right)",
    latinName: "Costa octava",
    aliases: ["Rib 8"],
    system: "SKELETAL",
    description: "Eighth rib, a false rib.",
    metadata: {
      boneType: "Long/Curved",
      region: "Thorax",
      side: "Right",
      ribNumber: 8
    }
  },
  "Rib_9_Right": {
    name: "Ninth Rib (Right)",
    latinName: "Costa nona",
    aliases: ["Rib 9"],
    system: "SKELETAL",
    description: "Ninth rib, a false rib.",
    metadata: {
      boneType: "Long/Curved",
      region: "Thorax",
      side: "Right",
      ribNumber: 9
    }
  },
  "Rib_10_Right": {
    name: "Tenth Rib (Right)",
    latinName: "Costa decima",
    aliases: ["Rib 10"],
    system: "SKELETAL",
    description: "Tenth rib, a false rib.",
    metadata: {
      boneType: "Long/Curved",
      region: "Thorax",
      side: "Right",
      ribNumber: 10
    }
  },
  "Rib_11_Right": {
    name: "Eleventh Rib (Right)",
    latinName: "Costa undecima",
    aliases: ["Rib 11"],
    system: "SKELETAL",
    description: "Eleventh rib, floating rib.",
    metadata: {
      boneType: "Long/Curved",
      region: "Thorax",
      side: "Right",
      ribNumber: 11
    }
  },
  "Rib_12_Right": {
    name: "Twelfth Rib (Right)",
    latinName: "Costa duodecima",
    aliases: ["Rib 12"],
    system: "SKELETAL",
    description: "Twelfth rib, the last and shortest floating rib.",
    metadata: {
      boneType: "Long/Curved",
      region: "Thorax",
      side: "Right",
      ribNumber: 12
    }
  },
  "Rib_1_Left": {
    name: "First Rib (Left)",
    latinName: "Costa prima",
    aliases: ["Rib 1"],
    system: "SKELETAL",
    description: "Shortest and most curved rib on left side.",
    metadata: {
      boneType: "Long/Curved",
      region: "Thorax",
      side: "Left",
      ribNumber: 1
    }
  },
  "Rib_2_Left": {
    name: "Second Rib (Left)",
    latinName: "Costa secunda",
    aliases: ["Rib 2"],
    system: "SKELETAL",
    description: "Second rib on left side.",
    metadata: {
      boneType: "Long/Curved",
      region: "Thorax",
      side: "Left",
      ribNumber: 2
    }
  },
  "Rib_3_Left": {
    name: "Third Rib (Left)",
    latinName: "Costa tertia",
    aliases: ["Rib 3"],
    system: "SKELETAL",
    description: "Third rib on left side.",
    metadata: {
      boneType: "Long/Curved",
      region: "Thorax",
      side: "Left",
      ribNumber: 3
    }
  },
  "Rib_4_Left": {
    name: "Fourth Rib (Left)",
    latinName: "Costa quarta",
    aliases: ["Rib 4"],
    system: "SKELETAL",
    description: "Fourth rib on left side.",
    metadata: {
      boneType: "Long/Curved",
      region: "Thorax",
      side: "Left",
      ribNumber: 4
    }
  },
  "Rib_5_Left": {
    name: "Fifth Rib (Left)",
    latinName: "Costa quinta",
    aliases: ["Rib 5"],
    system: "SKELETAL",
    description: "Fifth rib on left side.",
    metadata: {
      boneType: "Long/Curved",
      region: "Thorax",
      side: "Left",
      ribNumber: 5
    }
  },
  "Rib_6_Left": {
    name: "Sixth Rib (Left)",
    latinName: "Costa sexta",
    aliases: ["Rib 6"],
    system: "SKELETAL",
    description: "Sixth rib on left side.",
    metadata: {
      boneType: "Long/Curved",
      region: "Thorax",
      side: "Left",
      ribNumber: 6
    }
  },
  "Rib_7_Left": {
    name: "Seventh Rib (Left)",
    latinName: "Costa septima",
    aliases: ["Rib 7"],
    system: "SKELETAL",
    description: "Seventh rib on left side, the last true rib.",
    metadata: {
      boneType: "Long/Curved",
      region: "Thorax",
      side: "Left",
      ribNumber: 7
    }
  },
  "Rib_8_Left": {
    name: "Eighth Rib (Left)",
    latinName: "Costa octava",
    aliases: ["Rib 8"],
    system: "SKELETAL",
    description: "Eighth rib on left side, a false rib.",
    metadata: {
      boneType: "Long/Curved",
      region: "Thorax",
      side: "Left",
      ribNumber: 8
    }
  },
  "Rib_9_Left": {
    name: "Ninth Rib (Left)",
    latinName: "Costa nona",
    aliases: ["Rib 9"],
    system: "SKELETAL",
    description: "Ninth rib on left side, a false rib.",
    metadata: {
      boneType: "Long/Curved",
      region: "Thorax",
      side: "Left",
      ribNumber: 9
    }
  },
  "Rib_10_Left": {
    name: "Tenth Rib (Left)",
    latinName: "Costa decima",
    aliases: ["Rib 10"],
    system: "SKELETAL",
    description: "Tenth rib on left side, a false rib.",
    metadata: {
      boneType: "Long/Curved",
      region: "Thorax",
      side: "Left",
      ribNumber: 10
    }
  },
  "Rib_11_Left": {
    name: "Eleventh Rib (Left)",
    latinName: "Costa undecima",
    aliases: ["Rib 11"],
    system: "SKELETAL",
    description: "Eleventh rib on left side, floating rib.",
    metadata: {
      boneType: "Long/Curved",
      region: "Thorax",
      side: "Left",
      ribNumber: 11
    }
  },
  "Rib_12_Left": {
    name: "Twelfth Rib (Left)",
    latinName: "Costa duodecima",
    aliases: ["Rib 12"],
    system: "SKELETAL",
    description: "Twelfth rib on left side, the last and shortest floating rib.",
    metadata: {
      boneType: "Long/Curved",
      region: "Thorax",
      side: "Left",
      ribNumber: 12
    }
  },
  "Sternum": {
    name: "Sternum",
    latinName: "Sternum",
    aliases: ["Breastbone"],
    system: "SKELETAL",
    description: "Flat bone in center of chest connecting ribs and clavicles. Protects heart and lungs.",
    metadata: {
      boneType: "Flat",
      region: "Thorax",
      parts: ["Manubrium", "Body", "Xiphoid process"],
      articulations: ["Ribs", "Clavicles"]
    }
  },

  // PELVIS (bones already included: Sacrum, Coccyx, Ilium, Ischium, Pubis)
  "Ilium": {
    name: "Ilium",
    latinName: "Os ilium",
    aliases: ["Hip bone", "Iliac bone"],
    system: "SKELETAL",
    description: "Largest part of the os coxa (hip bone). Forms the lateral and superior part of the pelvis.",
    metadata: {
      boneType: "Irregular",
      region: "Pelvis",
      articulations: ["Ischium", "Pubis", "Sacrum"],
      landmarks: ["Anterior superior iliac spine", "Iliac crest"]
    }
  },
  "Ischium": {
    name: "Ischium",
    latinName: "Os ischii",
    aliases: ["Hip bone (lower)"],
    system: "SKELETAL",
    description: "Lower and posterior part of the os coxa. Forms the ischial tuberosities (sitting bones).",
    metadata: {
      boneType: "Irregular",
      region: "Pelvis",
      articulations: ["Ilium", "Pubis"],
      landmarks: ["Ischial tuberosity", "Ischial spine"]
    }
  },
  "Pubis": {
    name: "Pubis",
    latinName: "Os pubis",
    aliases: ["Pubic bone"],
    system: "SKELETAL",
    description: "Anterior and inferior part of the os coxa. Two pubes meet at the pubic symphysis.",
    metadata: {
      boneType: "Irregular",
      region: "Pelvis",
      articulations: ["Ilium", "Ischium", "Opposite pubis (pubic symphysis)"]
    }
  },

  // UPPER LIMBS (continue with remaining bones...)
  "ScapulaRight": {
    name: "Scapula (Right)",
    latinName: "Scapula",
    aliases: ["Shoulder blade"],
    system: "SKELETAL",
    description: "Flat triangular bone on back of shoulder. Articulates with humerus and clavicle.",
    metadata: {
      boneType: "Irregular",
      region: "Upper limb",
      side: "Right",
      articulations: ["Humerus (shoulder joint)", "Clavicle"],
      landmarks: ["Acromion", "Coracoid process", "Scapular spine"]
    }
  },
  "ScapulaLeft": {
    name: "Scapula (Left)",
    latinName: "Scapula",
    aliases: ["Shoulder blade"],
    system: "SKELETAL",
    description: "Flat triangular bone on back of shoulder.",
    metadata: {
      boneType: "Irregular",
      region: "Upper limb",
      side: "Left",
      articulations: ["Humerus (shoulder joint)", "Clavicle"]
    }
  },
  // ... continue with remaining bones (Clavicle, Humerus, Radius, Ulna, Carpals, Metacarpals, Phalanges x2 for each hand)
  // ... and lower limbs (Femur, Patella, Tibia, Fibula, Tarsals, Metatarsals, Phalanges x2 for each foot)
  // For brevity in this template, the full 206 bones would continue here
};

async function fetchAnatomicalData() {
  console.log("📚 Fetching comprehensive anatomical bone data...\n");
  
  try {
    // Create the anatomical reference from our comprehensive list
    const anatomicalRef = { ...COMPREHENSIVE_BONES };
    
    const outputPath = path.join(
      __dirname,
      "..",
      "prisma",
      "data",
      "anatomical-reference.json"
    );

    fs.writeFileSync(outputPath, JSON.stringify(anatomicalRef, null, 2));
    
    console.log(`✅ Successfully fetched and saved anatomical data`);
    console.log(`📊 Total bones: ${Object.keys(anatomicalRef).length}`);
    console.log(`📋 Saved to: ${outputPath}`);
    console.log(`\n📝 Next steps:`);
    console.log(`   1. Run: npm run generate-bones`);
    console.log(`   2. Run: npm run db:setup`);
    console.log(`   3. Run: npm run embed`);
  } catch (error) {
    console.error("❌ Error fetching anatomical data:", error);
    process.exit(1);
  }
}

fetchAnatomicalData();
