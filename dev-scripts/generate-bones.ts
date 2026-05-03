import * as fs from 'fs';
import * as path from 'path';

import { fileURLToPath } from 'url';
import { dirname } from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
interface BoneMetadata {
  boneType: 'long' | 'short' | 'flat' | 'irregular' | 'sesamoid';
  region: string;
  articulations?: string[];
  innervation?: string;
  bloodSupply?: string;
  side?: 'left' | 'right' | 'midline';
}

interface AnatomicalStructure {
  name: string;
  latinName: string;
  aliases: string[];
  system: string;
  description: string;
  metadata: BoneMetadata;
}

const bones: AnatomicalStructure[] = [];

// Helper function to add paired bones
function addPairedBone(
  name: string,
  latinName: string,
  aliases: string[],
  description: string,
  metadata: Omit<BoneMetadata, 'side'>
) {
  bones.push({
    name: `Left ${name}`,
    latinName: `${latinName} sinister`,
    aliases: aliases.map(a => `Left ${a}`),
    system: 'SKELETAL',
    description,
    metadata: { ...metadata, side: 'left' }
  });
  bones.push({
    name: `Right ${name}`,
    latinName: `${latinName} dexter`,
    aliases: aliases.map(a => `Right ${a}`),
    system: 'SKELETAL',
    description,
    metadata: { ...metadata, side: 'right' }
  });
}

// ==================== SKULL BONES (22) ====================

// Cranial bones (8)
bones.push({
  name: 'Frontal Bone',
  latinName: 'Os frontale',
  aliases: ['Forehead bone'],
  system: 'SKELETAL',
  description: 'The frontal bone forms the forehead (squamous part), the roof of the orbital cavities, and most of the anterior cranial fossa. It contains the frontal sinuses and articulates with the parietal, sphenoid, ethmoid, nasal, lacrimal, maxilla, and zygomatic bones.',
  metadata: {
    boneType: 'flat',
    region: 'Skull - Neurocranium',
    articulations: ['Parietal bones', 'Sphenoid bone', 'Ethmoid bone', 'Nasal bones', 'Lacrimal bones', 'Maxillae', 'Zygomatic bones'],
    bloodSupply: 'Supraorbital artery, supratrochlear artery',
    side: 'midline'
  }
});

addPairedBone(
  'Parietal Bone',
  'Os parietale',
  ['Parietal'],
  'The parietal bones form the superior and lateral walls of the cranium. Each is roughly quadrilateral, curved, with four borders and four angles. They protect the parietal lobes of the cerebral cortex.',
  {
    boneType: 'flat',
    region: 'Skull - Neurocranium',
    articulations: ['Frontal bone', 'Occipital bone', 'Temporal bone', 'Sphenoid bone', 'Opposite parietal bone'],
    bloodSupply: 'Middle meningeal artery'
  }
);

addPairedBone(
  'Temporal Bone',
  'Os temporale',
  ['Temple bone'],
  'The temporal bone is a complex bone forming part of the lateral skull and cranial base. It houses the middle and inner ear structures, contains the mastoid process and styloid process, and forms the temporomandibular joint with the mandible.',
  {
    boneType: 'irregular',
    region: 'Skull - Neurocranium',
    articulations: ['Parietal bone', 'Occipital bone', 'Sphenoid bone', 'Zygomatic bone', 'Mandible'],
    innervation: 'Contains facial nerve canal, vestibulocochlear apparatus',
    bloodSupply: 'Middle meningeal artery, superficial temporal artery'
  }
);

bones.push({
  name: 'Occipital Bone',
  latinName: 'Os occipitale',
  aliases: ['Occiput'],
  system: 'SKELETAL',
  description: 'The occipital bone forms the posterior and inferior portion of the cranium. It contains the foramen magnum through which the spinal cord passes, and the occipital condyles which articulate with the atlas (C1). It also features the external occipital protuberance.',
  metadata: {
    boneType: 'flat',
    region: 'Skull - Neurocranium',
    articulations: ['Parietal bones', 'Temporal bones', 'Sphenoid bone', 'Atlas (C1)'],
    bloodSupply: 'Occipital artery, vertebral artery',
    side: 'midline'
  }
});

bones.push({
  name: 'Sphenoid Bone',
  latinName: 'Os sphenoidale',
  aliases: ['Wasp bone', 'Butterfly bone'],
  system: 'SKELETAL',
  description: 'The sphenoid bone is a butterfly-shaped bone forming the middle part of the cranial base. It contains the sella turcica housing the pituitary gland, the optic canals, superior orbital fissures, and foramen rotundum, ovale, and spinosum. It articulates with all other cranial bones.',
  metadata: {
    boneType: 'irregular',
    region: 'Skull - Neurocranium',
    articulations: ['Frontal bone', 'Parietal bones', 'Temporal bones', 'Occipital bone', 'Ethmoid bone', 'Palatine bones', 'Vomer', 'Zygomatic bones'],
    innervation: 'Transmits CN II, III, IV, V1, V2, VI',
    bloodSupply: 'Middle meningeal artery, internal carotid artery branches',
    side: 'midline'
  }
});

bones.push({
  name: 'Ethmoid Bone',
  latinName: 'Os ethmoidale',
  aliases: ['Sieve bone'],
  system: 'SKELETAL',
  description: 'The ethmoid bone is a delicate, spongy bone at the roof of the nasal cavity and between the orbits. It contains the cribriform plate (transmitting olfactory nerves), perpendicular plate, superior and middle nasal conchae, and the ethmoid air cells (sinuses).',
  metadata: {
    boneType: 'irregular',
    region: 'Skull - Neurocranium',
    articulations: ['Frontal bone', 'Sphenoid bone', 'Nasal bones', 'Maxillae', 'Lacrimal bones', 'Palatine bones', 'Inferior nasal conchae', 'Vomer'],
    innervation: 'Transmits olfactory nerve fibers (CN I)',
    bloodSupply: 'Anterior and posterior ethmoidal arteries',
    side: 'midline'
  }
});

// Facial bones (14)
addPairedBone(
  'Nasal Bone',
  'Os nasale',
  ['Nose bone'],
  'The nasal bones are two small, oblong bones that form the bridge of the nose. They articulate with each other in the midline, with the frontal bone superiorly, and with the maxillae laterally.',
  {
    boneType: 'flat',
    region: 'Skull - Viscerocranium',
    articulations: ['Frontal bone', 'Ethmoid bone', 'Opposite nasal bone', 'Maxilla'],
    bloodSupply: 'Dorsal nasal artery'
  }
);

addPairedBone(
  'Lacrimal Bone',
  'Os lacrimale',
  ['Tear bone'],
  'The lacrimal bone is the smallest and most fragile bone of the face. It forms part of the medial wall of the orbit and contains the lacrimal fossa, which houses the lacrimal sac for tear drainage.',
  {
    boneType: 'flat',
    region: 'Skull - Viscerocranium',
    articulations: ['Frontal bone', 'Ethmoid bone', 'Maxilla', 'Inferior nasal concha'],
    bloodSupply: 'Infraorbital artery'
  }
);

addPairedBone(
  'Zygomatic Bone',
  'Os zygomaticum',
  ['Cheekbone', 'Malar bone', 'Zygoma'],
  'The zygomatic bone forms the prominence of the cheek and part of the lateral wall and floor of the orbit. It articulates with the frontal, sphenoid, temporal, and maxillary bones, forming the zygomatic arch with the temporal bone.',
  {
    boneType: 'irregular',
    region: 'Skull - Viscerocranium',
    articulations: ['Frontal bone', 'Sphenoid bone', 'Temporal bone', 'Maxilla'],
    innervation: 'Zygomaticofacial and zygomaticotemporal nerves (CN V2)',
    bloodSupply: 'Zygomatico-orbital artery, transverse facial artery'
  }
);

addPairedBone(
  'Maxilla',
  'Maxilla',
  ['Upper jaw bone', 'Maxillary bone'],
  'The maxilla is a major bone of the face, forming the upper jaw, anterior hard palate, part of the lateral nasal wall, and the floor of the orbit. It contains the maxillary sinus (largest paranasal sinus) and the alveolar process bearing the upper teeth.',
  {
    boneType: 'irregular',
    region: 'Skull - Viscerocranium',
    articulations: ['Frontal bone', 'Ethmoid bone', 'Nasal bone', 'Lacrimal bone', 'Zygomatic bone', 'Inferior nasal concha', 'Palatine bone', 'Vomer', 'Opposite maxilla'],
    innervation: 'Infraorbital nerve (CN V2), superior alveolar nerves',
    bloodSupply: 'Infraorbital artery, superior alveolar arteries, greater palatine artery'
  }
);

bones.push({
  name: 'Vomer',
  latinName: 'Vomer',
  aliases: ['Ploughshare bone'],
  system: 'SKELETAL',
  description: 'The vomer is a thin, flat, unpaired bone that forms the inferior and posterior part of the nasal septum. It articulates with the sphenoid, ethmoid, palatine bones, and maxillae, and separates the nasal cavity into left and right sides.',
  metadata: {
    boneType: 'flat',
    region: 'Skull - Viscerocranium',
    articulations: ['Sphenoid bone', 'Ethmoid bone', 'Palatine bones', 'Maxillae'],
    bloodSupply: 'Sphenopalatine artery',
    side: 'midline'
  }
});

addPairedBone(
  'Palatine Bone',
  'Os palatinum',
  ['Palate bone'],
  'The palatine bone is an L-shaped bone forming the posterior part of the hard palate, part of the nasal cavity floor, and part of the orbital floor. It consists of horizontal and perpendicular plates and contributes to the pterygopalatine fossa.',
  {
    boneType: 'irregular',
    region: 'Skull - Viscerocranium',
    articulations: ['Sphenoid bone', 'Ethmoid bone', 'Maxilla', 'Inferior nasal concha', 'Vomer', 'Opposite palatine bone'],
    innervation: 'Greater and lesser palatine nerves (CN V2)',
    bloodSupply: 'Greater palatine artery, lesser palatine arteries'
  }
);

addPairedBone(
  'Inferior Nasal Concha',
  'Concha nasalis inferior',
  ['Inferior turbinate', 'Inferior nasal turbinate'],
  'The inferior nasal concha is a separate bone (unlike the superior and middle conchae which are part of the ethmoid) that forms a curved shelf on the lateral nasal wall. It warms, humidifies, and filters inspired air.',
  {
    boneType: 'irregular',
    region: 'Skull - Viscerocranium',
    articulations: ['Ethmoid bone', 'Maxilla', 'Lacrimal bone', 'Palatine bone'],
    bloodSupply: 'Sphenopalatine artery, anterior ethmoidal artery'
  }
);

bones.push({
  name: 'Mandible',
  latinName: 'Mandibula',
  aliases: ['Lower jaw', 'Jawbone'],
  system: 'SKELETAL',
  description: 'The mandible is the largest and strongest bone of the face, forming the lower jaw. It consists of a horizontal body bearing the lower teeth and two vertical rami ending in the coronoid and condylar processes. The condylar process articulates with the temporal bone forming the temporomandibular joint.',
  metadata: {
    boneType: 'irregular',
    region: 'Skull - Viscerocranium',
    articulations: ['Temporal bones (TMJ)'],
    innervation: 'Inferior alveolar nerve (CN V3), mental nerve',
    bloodSupply: 'Inferior alveolar artery, mental artery',
    side: 'midline'
  }
});

// Auditory ossicles (6 total, 3 per ear)
['Left', 'Right'].forEach(side => {
  bones.push({
    name: `${side} Malleus`,
    latinName: `Malleus ${side === 'Left' ? 'sinister' : 'dexter'}`,
    aliases: [`${side} Hammer`],
    system: 'SKELETAL',
    description: 'The malleus is the largest and most lateral of the auditory ossicles. Its handle attaches to the tympanic membrane, and its head articulates with the incus. It transmits sound vibrations from the eardrum to the incus.',
    metadata: {
      boneType: 'irregular',
      region: 'Skull - Middle Ear',
      articulations: ['Incus', 'Tympanic membrane'],
      innervation: 'Tensor tympani muscle (CN V3)',
      bloodSupply: 'Anterior tympanic artery',
      side: side.toLowerCase() as 'left' | 'right'
    }
  });

  bones.push({
    name: `${side} Incus`,
    latinName: `Incus ${side === 'Left' ? 'sinister' : 'dexter'}`,
    aliases: [`${side} Anvil`],
    system: 'SKELETAL',
    description: 'The incus is the middle auditory ossicle, shaped like an anvil. It articulates with the malleus superiorly and the stapes inferiorly, transmitting sound vibrations through the ossicular chain.',
    metadata: {
      boneType: 'irregular',
      region: 'Skull - Middle Ear',
      articulations: ['Malleus', 'Stapes'],
      bloodSupply: 'Anterior tympanic artery, stylomastoid artery',
      side: side.toLowerCase() as 'left' | 'right'
    }
  });

  bones.push({
    name: `${side} Stapes`,
    latinName: `Stapes ${side === 'Left' ? 'sinister' : 'dexter'}`,
    aliases: [`${side} Stirrup`],
    system: 'SKELETAL',
    description: 'The stapes is the smallest bone in the human body, shaped like a stirrup. Its footplate fits into the oval window of the cochlea, transmitting sound vibrations to the inner ear fluid.',
    metadata: {
      boneType: 'irregular',
      region: 'Skull - Middle Ear',
      articulations: ['Incus', 'Oval window'],
      innervation: 'Stapedius muscle (CN VII)',
      bloodSupply: 'Stylomastoid artery',
      side: side.toLowerCase() as 'left' | 'right'
    }
  });
});

// Hyoid bone
bones.push({
  name: 'Hyoid Bone',
  latinName: 'Os hyoideum',
  aliases: ['Lingual bone'],
  system: 'SKELETAL',
  description: 'The hyoid is a unique U-shaped bone that does not articulate with any other bone. It is suspended by muscles and ligaments at the base of the tongue, supporting tongue movements, swallowing, and speech. It consists of a body and paired greater and lesser horns.',
  metadata: {
    boneType: 'irregular',
    region: 'Neck',
    articulations: [],
    innervation: 'Ansa cervicalis, hypoglossal nerve (CN XII)',
    bloodSupply: 'Lingual artery, superior thyroid artery',
    side: 'midline'
  }
});

// ==================== VERTEBRAL COLUMN (26 counted as 24 + sacrum + coccyx) ====================

// Cervical vertebrae (7)
const cervicalDescriptions: { [key: string]: string } = {
  'C1': 'The atlas (C1) is the first cervical vertebra, named after the Titan Atlas who held up the sky. It is unique in lacking a vertebral body and spinous process. It supports the skull and allows nodding (flexion/extension) through its articulation with the occipital condyles.',
  'C2': 'The axis (C2) is the second cervical vertebra, characterized by the dens (odontoid process) projecting superiorly from its body. The dens acts as a pivot around which the atlas rotates, allowing head rotation (saying "no").',
  'C3': 'The third cervical vertebra (C3) is a typical cervical vertebra with a small body, bifid spinous process, and transverse foramina for the vertebral artery. It contributes to the cervical lordosis and neck mobility.',
  'C4': 'The fourth cervical vertebra (C4) is a typical cervical vertebra. The C4 spinal nerve contributes to the phrenic nerve, critical for diaphragm function and breathing.',
  'C5': 'The fifth cervical vertebra (C5) is a typical cervical vertebra. C5 nerve roots contribute to shoulder abduction and elbow flexion.',
  'C6': 'The sixth cervical vertebra (C6) has a prominent anterior tubercle (carotid tubercle or Chassaignac tubercle) where the common carotid artery can be compressed. C6 dermatome includes the thumb.',
  'C7': 'The seventh cervical vertebra (C7), also called vertebra prominens, has an exceptionally long spinous process that is easily palpable at the base of the neck. It marks the cervicothoracic junction.'
};

for (let i = 1; i <= 7; i++) {
  const name = i === 1 ? 'Atlas' : i === 2 ? 'Axis' : `Cervical Vertebra C${i}`;
  const latinName = i === 1 ? 'Atlas (C1)' : i === 2 ? 'Axis (C2)' : `Vertebra cervicalis ${i}`;
  
  bones.push({
    name,
    latinName,
    aliases: [`C${i}`, `${i === 1 ? 'First' : i === 2 ? 'Second' : ['Third', 'Fourth', 'Fifth', 'Sixth', 'Seventh'][i-3]} cervical vertebra`],
    system: 'SKELETAL',
    description: cervicalDescriptions[`C${i}`],
    metadata: {
      boneType: 'irregular',
      region: 'Vertebral Column - Cervical',
      articulations: i === 1 
        ? ['Occipital condyles', 'Axis (C2)'] 
        : i === 2 
          ? ['Atlas (C1)', 'C3']
          : i === 7 
            ? ['C6', 'T1']
            : [`C${i-1}`, `C${i+1}`],
      innervation: `C${i} spinal nerve`,
      bloodSupply: 'Vertebral artery, ascending cervical artery',
      side: 'midline'
    }
  });
}

// Thoracic vertebrae (12)
for (let i = 1; i <= 12; i++) {
  const ribArticulation = i === 1 
    ? 'Articulates with 1st rib only'
    : i === 10 
      ? 'Articulates with 10th rib only'
      : i === 11 
        ? 'Articulates with 11th rib only (floating rib)'
        : i === 12 
          ? 'Articulates with 12th rib only (floating rib)'
          : `Articulates with ${i}th and ${i-1}th ribs`;

  bones.push({
    name: `Thoracic Vertebra T${i}`,
    latinName: `Vertebra thoracica ${i}`,
    aliases: [`T${i}`, `${['First', 'Second', 'Third', 'Fourth', 'Fifth', 'Sixth', 'Seventh', 'Eighth', 'Ninth', 'Tenth', 'Eleventh', 'Twelfth'][i-1]} thoracic vertebra`],
    system: 'SKELETAL',
    description: `Thoracic vertebra T${i} is characterized by heart-shaped vertebral body, long inferiorly-directed spinous process, and costal facets for rib articulation. ${ribArticulation}. The thoracic vertebrae contribute to the thoracic kyphosis and protect the thoracic spinal cord.`,
    metadata: {
      boneType: 'irregular',
      region: 'Vertebral Column - Thoracic',
      articulations: [
        i === 1 ? 'C7' : `T${i-1}`,
        i === 12 ? 'L1' : `T${i+1}`,
        `Rib ${i}`
      ],
      innervation: `T${i} spinal nerve (intercostal nerve)`,
      bloodSupply: 'Posterior intercostal arteries, spinal branches',
      side: 'midline'
    }
  });
}

// Lumbar vertebrae (5)
for (let i = 1; i <= 5; i++) {
  bones.push({
    name: `Lumbar Vertebra L${i}`,
    latinName: `Vertebra lumbalis ${i}`,
    aliases: [`L${i}`, `${['First', 'Second', 'Third', 'Fourth', 'Fifth'][i-1]} lumbar vertebra`],
    system: 'SKELETAL',
    description: `Lumbar vertebra L${i} is the largest vertebra type, characterized by a large kidney-shaped body, thick pedicles, and a square spinous process. The lumbar vertebrae bear the majority of body weight and allow significant flexion/extension. ${i === 3 ? 'L3 is at the level of the umbilicus.' : ''} ${i === 4 ? 'L4 is at the level of the iliac crests (useful landmark for lumbar puncture).' : ''} ${i === 5 ? 'L5 is the largest vertebra and articulates with the sacrum at the lumbosacral joint.' : ''}`,
    metadata: {
      boneType: 'irregular',
      region: 'Vertebral Column - Lumbar',
      articulations: [
        i === 1 ? 'T12' : `L${i-1}`,
        i === 5 ? 'Sacrum (S1)' : `L${i+1}`
      ],
      innervation: `L${i} spinal nerve`,
      bloodSupply: 'Lumbar arteries, iliolumbar artery',
      side: 'midline'
    }
  });
}

// Sacrum (5 fused vertebrae counted as 1)
bones.push({
  name: 'Sacrum',
  latinName: 'Os sacrum',
  aliases: ['Sacred bone', 'S1-S5 fused'],
  system: 'SKELETAL',
  description: 'The sacrum is a large triangular bone formed by the fusion of five sacral vertebrae (S1-S5). It forms the posterior wall of the pelvis, articulates with the L5 vertebra superiorly, coccyx inferiorly, and iliac bones laterally at the sacroiliac joints. It contains the sacral canal and four pairs of sacral foramina.',
  metadata: {
    boneType: 'irregular',
    region: 'Vertebral Column - Sacral',
    articulations: ['L5 vertebra', 'Coccyx', 'Right ilium', 'Left ilium'],
    innervation: 'Sacral spinal nerves S1-S5, sacral plexus',
    bloodSupply: 'Median sacral artery, lateral sacral arteries, iliolumbar artery',
    side: 'midline'
  }
});

// Coccyx (3-5 fused vertebrae counted as 1)
bones.push({
  name: 'Coccyx',
  latinName: 'Os coccygis',
  aliases: ['Tailbone', 'Coccygeal vertebrae'],
  system: 'SKELETAL',
  description: 'The coccyx is a small triangular bone formed by the fusion of 3-5 (typically 4) coccygeal vertebrae. It represents the vestigial tail in humans. It provides attachment for muscles and ligaments of the pelvic floor and is weight-bearing when sitting.',
  metadata: {
    boneType: 'irregular',
    region: 'Vertebral Column - Coccygeal',
    articulations: ['Sacrum'],
    innervation: 'Coccygeal nerve',
    bloodSupply: 'Median sacral artery',
    side: 'midline'
  }
});

// ==================== THORACIC CAGE ====================

// Ribs (24 - 12 pairs)
for (let i = 1; i <= 12; i++) {
  const ribType = i <= 7 ? 'true rib (vertebrosternal)' : i <= 10 ? 'false rib (vertebrochondral)' : 'floating rib (vertebral)';
  const attachment = i <= 7 
    ? 'attaches directly to sternum via costal cartilage'
    : i <= 10 
      ? 'attaches to sternum indirectly via cartilage of rib above'
      : 'has free anterior end (floating)';

  addPairedBone(
    `Rib ${i}`,
    `Costa ${i}`,
    [`${['First', 'Second', 'Third', 'Fourth', 'Fifth', 'Sixth', 'Seventh', 'Eighth', 'Ninth', 'Tenth', 'Eleventh', 'Twelfth'][i-1]} rib`],
    `Rib ${i} is a ${ribType} that ${attachment}. It articulates with thoracic vertebrae T${i}${i > 1 && i <= 10 ? ` and T${i-1}` : ''} posteriorly. Ribs protect thoracic organs and assist in breathing mechanics.`,
    {
      boneType: 'flat',
      region: 'Thoracic Cage',
      articulations: [
        `T${i} vertebra`,
        ...(i <= 7 ? ['Sternum'] : i <= 10 ? [`Rib ${i-1} cartilage`] : [])
      ],
      innervation: `Intercostal nerve T${i}`,
      bloodSupply: i <= 2 ? 'Supreme intercostal artery' : 'Posterior intercostal arteries, internal thoracic artery'
    }
  );
}

// Sternum
bones.push({
  name: 'Sternum',
  latinName: 'Sternum',
  aliases: ['Breastbone'],
  system: 'SKELETAL',
  description: 'The sternum is a flat bone in the center of the anterior thorax consisting of three parts: manubrium (superior), body (middle), and xiphoid process (inferior). It articulates with the clavicles and costal cartilages of ribs 1-7. The sternal angle (angle of Louis) between manubrium and body marks the T4/T5 level and rib 2 attachment.',
  metadata: {
    boneType: 'flat',
    region: 'Thoracic Cage',
    articulations: ['Clavicles', 'Ribs 1-7 via costal cartilages'],
    bloodSupply: 'Internal thoracic artery, perforating branches',
    side: 'midline'
  }
});

// ==================== PECTORAL GIRDLE ====================

addPairedBone(
  'Clavicle',
  'Clavicula',
  ['Collarbone'],
  'The clavicle is a long bone that serves as a strut between the scapula and sternum. It is the most commonly fractured bone in the body. It provides attachment for muscles, protects underlying neurovascular structures, and transmits force from the upper limb to the axial skeleton.',
  {
    boneType: 'long',
    region: 'Pectoral Girdle',
    articulations: ['Sternum (sternoclavicular joint)', 'Scapula (acromioclavicular joint)'],
    innervation: 'Supraclavicular nerves (C3-C4)',
    bloodSupply: 'Suprascapular artery, thoracoacromial artery'
  }
);

addPairedBone(
  'Scapula',
  'Scapula',
  ['Shoulder blade'],
  'The scapula is a triangular flat bone on the posterior thorax. Key features include the spine, acromion, coracoid process, glenoid fossa (for humeral articulation), and fossae for rotator cuff muscles. It provides attachment for 17 muscles and allows great mobility of the upper limb.',
  {
    boneType: 'flat',
    region: 'Pectoral Girdle',
    articulations: ['Clavicle (acromioclavicular joint)', 'Humerus (glenohumeral joint)'],
    innervation: 'Suprascapular nerve, subscapular nerves, thoracodorsal nerve',
    bloodSupply: 'Suprascapular artery, circumflex scapular artery, dorsal scapular artery'
  }
);

// ==================== UPPER LIMB ====================

addPairedBone(
  'Humerus',
  'Humerus',
  ['Upper arm bone', 'Arm bone'],
  'The humerus is the long bone of the upper arm extending from shoulder to elbow. Proximal features include the head, greater and lesser tubercles, and surgical neck. The shaft has the deltoid tuberosity and spiral groove (radial nerve). Distal features include the capitulum (radius articulation), trochlea (ulna articulation), and epicondyles.',
  {
    boneType: 'long',
    region: 'Upper Limb - Arm',
    articulations: ['Scapula (glenohumeral joint)', 'Radius (humeroradial joint)', 'Ulna (humeroulnar joint)'],
    innervation: 'Radial nerve (spiral groove), musculocutaneous nerve, axillary nerve',
    bloodSupply: 'Anterior and posterior circumflex humeral arteries, deep brachial artery'
  }
);

addPairedBone(
  'Radius',
  'Radius',
  ['Radial bone'],
  'The radius is the lateral bone of the forearm (thumb side). Proximally it has a disc-shaped head that rotates on the capitulum. Distally it is broad, articulating with carpal bones and forming the main wrist joint. The radius rotates around the ulna during pronation and supination.',
  {
    boneType: 'long',
    region: 'Upper Limb - Forearm',
    articulations: ['Humerus (humeroradial joint)', 'Ulna (proximal and distal radioulnar joints)', 'Scaphoid', 'Lunate'],
    innervation: 'Posterior interosseous nerve (supinator)',
    bloodSupply: 'Radial artery, anterior interosseous artery'
  }
);

addPairedBone(
  'Ulna',
  'Ulna',
  ['Ulnar bone'],
  'The ulna is the medial bone of the forearm (pinky side). Proximally it has the olecranon (elbow tip), trochlear notch (humerus articulation), and coronoid process. It is the main forearm bone at the elbow but has minimal direct wrist articulation, connecting via the triangular fibrocartilage complex.',
  {
    boneType: 'long',
    region: 'Upper Limb - Forearm',
    articulations: ['Humerus (humeroulnar joint)', 'Radius (proximal and distal radioulnar joints)'],
    innervation: 'Ulnar nerve, median nerve (forearm muscles)',
    bloodSupply: 'Ulnar artery, posterior interosseous artery'
  }
);

// Carpal bones (16 - 8 per hand)
const carpals = [
  { name: 'Scaphoid', latin: 'Os scaphoideum', aliases: ['Navicular bone of hand'], description: 'The scaphoid is the largest carpal bone of the proximal row, located on the radial (thumb) side. It is the most commonly fractured carpal bone, often from falls on an outstretched hand. Blood supply enters distally, making proximal pole fractures prone to avascular necrosis.', articulations: ['Radius', 'Lunate', 'Trapezium', 'Trapezoid', 'Capitate'] },
  { name: 'Lunate', latin: 'Os lunatum', aliases: ['Semilunar bone'], description: 'The lunate is a crescent moon-shaped carpal bone in the center of the proximal row. It articulates with the radius proximally and is the most commonly dislocated carpal bone. Kienböck disease is avascular necrosis of the lunate.', articulations: ['Radius', 'Scaphoid', 'Triquetrum', 'Capitate', 'Hamate'] },
  { name: 'Triquetrum', latin: 'Os triquetrum', aliases: ['Pyramidal bone', 'Triquetral bone'], description: 'The triquetrum is a pyramid-shaped carpal bone on the ulnar side of the proximal row. It articulates with the pisiform anteriorly and contributes to the midcarpal and radiocarpal joints.', articulations: ['Lunate', 'Pisiform', 'Hamate'] },
  { name: 'Pisiform', latin: 'Os pisiforme', aliases: ['Pea bone'], description: 'The pisiform is a small, pea-shaped sesamoid bone embedded in the flexor carpi ulnaris tendon. It is the smallest carpal bone and forms part of the ulnar border of the carpal tunnel.', articulations: ['Triquetrum'] },
  { name: 'Trapezium', latin: 'Os trapezium', aliases: ['Greater multangular'], description: 'The trapezium is a carpal bone at the base of the thumb (first metacarpal). Its saddle-shaped joint with the first metacarpal allows the thumb\'s opposition movement, essential for gripping.', articulations: ['Scaphoid', 'Trapezoid', 'First metacarpal', 'Second metacarpal'] },
  { name: 'Trapezoid', latin: 'Os trapezoideum', aliases: ['Lesser multangular'], description: 'The trapezoid is the smallest bone in the distal carpal row, wedged between the trapezium and capitate. It articulates with the second metacarpal distally.', articulations: ['Scaphoid', 'Trapezium', 'Capitate', 'Second metacarpal'] },
  { name: 'Capitate', latin: 'Os capitatum', aliases: ['Os magnum'], description: 'The capitate is the largest carpal bone, located centrally in the distal row. Its head articulates with the lunate and scaphoid proximally. It forms the keystone of the carpal arch and articulates with the third metacarpal.', articulations: ['Scaphoid', 'Lunate', 'Trapezoid', 'Hamate', 'Second metacarpal', 'Third metacarpal', 'Fourth metacarpal'] },
  { name: 'Hamate', latin: 'Os hamatum', aliases: ['Unciform bone'], description: 'The hamate is a wedge-shaped carpal bone on the ulnar side of the distal row. It features a distinctive hook (hamulus) that forms the ulnar border of the carpal tunnel. The hook is palpable and may fracture from gripping activities (golfers, batters).', articulations: ['Lunate', 'Triquetrum', 'Capitate', 'Fourth metacarpal', 'Fifth metacarpal'] }
];

['Left', 'Right'].forEach(side => {
  carpals.forEach(carpal => {
    bones.push({
      name: `${side} ${carpal.name}`,
      latinName: `${carpal.latin} ${side === 'Left' ? 'sinister' : 'dexter'}`,
      aliases: carpal.aliases.map(a => `${side} ${a}`),
      system: 'SKELETAL',
      description: carpal.description,
      metadata: {
        boneType: carpal.name === 'Pisiform' ? 'sesamoid' : 'short',
        region: 'Upper Limb - Wrist (Carpus)',
        articulations: carpal.articulations,
        bloodSupply: 'Radial artery, ulnar artery, palmar carpal arch',
        side: side.toLowerCase() as 'left' | 'right'
      }
    });
  });
});

// Metacarpals (10 - 5 per hand)
['Left', 'Right'].forEach(side => {
  for (let i = 1; i <= 5; i++) {
    const fingerName = ['Thumb', 'Index finger', 'Middle finger', 'Ring finger', 'Little finger'][i-1];
    const ordinal = ['First', 'Second', 'Third', 'Fourth', 'Fifth'][i-1];
    
    bones.push({
      name: `${side} Metacarpal ${i}`,
      latinName: `Os metacarpale ${i} ${side === 'Left' ? 'sinister' : 'dexter'}`,
      aliases: [`${side} ${ordinal} metacarpal`, `${side} ${fingerName} metacarpal`],
      system: 'SKELETAL',
      description: `The ${ordinal.toLowerCase()} metacarpal is a long bone of the hand connecting the carpus to the ${fingerName.toLowerCase()}. It has a base (proximal, articulating with carpals), shaft, and head (distal, forming the knuckle). ${i === 1 ? 'The first metacarpal is shorter and more mobile, allowing thumb opposition.' : ''} ${i === 5 ? 'The fifth metacarpal base is commonly fractured (Boxer\'s fracture).' : ''}`,
      metadata: {
        boneType: 'long',
        region: 'Upper Limb - Hand (Metacarpus)',
        articulations: [
          ...(i === 1 ? ['Trapezium'] : i === 2 ? ['Trapezium', 'Trapezoid', 'Capitate'] : i === 3 ? ['Capitate'] : i === 4 ? ['Capitate', 'Hamate'] : ['Hamate']),
          `Proximal phalanx of ${fingerName.toLowerCase()}`
        ],
        innervation: i <= 2 ? 'Median nerve (thenar muscles)' : 'Ulnar nerve (interossei)',
        bloodSupply: 'Palmar metacarpal arteries, dorsal metacarpal arteries',
        side: side.toLowerCase() as 'left' | 'right'
      }
    });
  }
});

// Hand phalanges (28 - 14 per hand)
['Left', 'Right'].forEach(side => {
  const fingers = ['Thumb', 'Index Finger', 'Middle Finger', 'Ring Finger', 'Little Finger'];
  
  fingers.forEach((finger, idx) => {
    const fingerNum = idx + 1;
    const isThumb = fingerNum === 1;
    const phalanxTypes = isThumb ? ['Proximal', 'Distal'] : ['Proximal', 'Middle', 'Distal'];
    
    phalanxTypes.forEach((type) => {
      bones.push({
        name: `${side} ${finger} ${type} Phalanx`,
        latinName: `Phalanx ${type.toLowerCase()} digiti ${fingerNum === 1 ? 'pollicis' : fingerNum === 2 ? 'indicis' : fingerNum === 3 ? 'medii' : fingerNum === 4 ? 'anularis' : 'minimi'} manus ${side === 'Left' ? 'sinister' : 'dexter'}`,
        aliases: [`${side} ${type.toLowerCase()} phalanx of ${finger.toLowerCase()}`],
        system: 'SKELETAL',
        description: `The ${type.toLowerCase()} phalanx of the ${finger.toLowerCase()} is ${type === 'Proximal' ? 'the longest phalanx, articulating with the metacarpal head proximally' : type === 'Middle' ? 'located between the proximal and distal phalanges (absent in thumb)' : 'the terminal bone bearing the fingernail'}. ${isThumb && type === 'Distal' ? 'The thumb has only two phalanges, making it shorter but more mobile for opposition.' : ''}`,
        metadata: {
          boneType: 'long',
          region: 'Upper Limb - Hand (Phalanges)',
          articulations: type === 'Proximal' 
            ? [`Metacarpal ${fingerNum}`, isThumb ? 'Distal phalanx' : 'Middle phalanx']
            : type === 'Middle' 
              ? ['Proximal phalanx', 'Distal phalanx']
              : [isThumb ? 'Proximal phalanx' : 'Middle phalanx'],
          innervation: fingerNum <= 3 || (fingerNum === 4 && type !== 'Distal') ? 'Median nerve (digital branches)' : 'Ulnar nerve (digital branches)',
          bloodSupply: 'Proper palmar digital arteries',
          side: side.toLowerCase() as 'left' | 'right'
        }
      });
    });
  });
});

// ==================== PELVIS ====================

addPairedBone(
  'Ilium',
  'Os ilium',
  ['Iliac bone'],
  'The ilium is the largest part of the hip bone, forming the superior portion. It features the iliac crest (palpable at the waist), anterior superior iliac spine (ASIS), and the iliac fossa. It articulates with the sacrum at the sacroiliac joint and fuses with the ischium and pubis at the acetabulum.',
  {
    boneType: 'flat',
    region: 'Pelvis',
    articulations: ['Sacrum (sacroiliac joint)', 'Ischium', 'Pubis', 'Femur (via acetabulum)'],
    innervation: 'Ilioinguinal nerve, iliohypogastric nerve, superior gluteal nerve',
    bloodSupply: 'Iliolumbar artery, superior gluteal artery, deep circumflex iliac artery'
  }
);

addPairedBone(
  'Ischium',
  'Os ischii',
  ['Seat bone', 'Ischial bone'],
  'The ischium forms the posteroinferior part of the hip bone. The ischial tuberosity bears weight when sitting and is the origin of the hamstrings. The ischial spine is a landmark for pudendal nerve block. The lesser sciatic notch is inferior to the spine.',
  {
    boneType: 'irregular',
    region: 'Pelvis',
    articulations: ['Ilium', 'Pubis', 'Femur (via acetabulum)'],
    innervation: 'Posterior femoral cutaneous nerve, sciatic nerve',
    bloodSupply: 'Obturator artery, inferior gluteal artery'
  }
);

addPairedBone(
  'Pubis',
  'Os pubis',
  ['Pubic bone'],
  'The pubis forms the anteromedial part of the hip bone. The two pubic bones meet at the pubic symphysis, a cartilaginous joint. The superior pubic ramus and inferior pubic ramus frame the obturator foramen. The pubic tubercle is a key landmark for inguinal anatomy.',
  {
    boneType: 'irregular',
    region: 'Pelvis',
    articulations: ['Ilium', 'Ischium', 'Opposite pubis (pubic symphysis)', 'Femur (via acetabulum)'],
    innervation: 'Ilioinguinal nerve, genitofemoral nerve',
    bloodSupply: 'Obturator artery, inferior epigastric artery'
  }
);

// ==================== LOWER LIMB ====================

addPairedBone(
  'Femur',
  'Femur',
  ['Thigh bone'],
  'The femur is the longest and strongest bone in the body. Proximally it has the head (hip joint), neck (common fracture site), and greater and lesser trochanters. The shaft is bowed anteriorly with the linea aspera posteriorly. Distally, the medial and lateral condyles articulate with the tibia.',
  {
    boneType: 'long',
    region: 'Lower Limb - Thigh',
    articulations: ['Hip bone (acetabulum)', 'Tibia (knee joint)', 'Patella (patellofemoral joint)'],
    innervation: 'Femoral nerve, sciatic nerve, obturator nerve',
    bloodSupply: 'Medial and lateral circumflex femoral arteries, profunda femoris artery'
  }
);

addPairedBone(
  'Patella',
  'Patella',
  ['Kneecap'],
  'The patella is the largest sesamoid bone, embedded in the quadriceps tendon. It protects the knee joint anteriorly and improves the mechanical advantage of the quadriceps for knee extension by increasing the moment arm. It articulates with the femoral trochlea.',
  {
    boneType: 'sesamoid',
    region: 'Lower Limb - Knee',
    articulations: ['Femur (patellofemoral joint)'],
    innervation: 'Femoral nerve (via quadriceps)',
    bloodSupply: 'Genicular arteries (anastomosis around knee)'
  }
);

addPairedBone(
  'Tibia',
  'Tibia',
  ['Shinbone', 'Shin bone'],
  'The tibia is the larger, medial bone of the leg, bearing most of the body weight. Proximally, the medial and lateral condyles form the tibial plateau (knee joint). The tibial tuberosity is the patellar tendon attachment. The medial malleolus forms the medial ankle prominence.',
  {
    boneType: 'long',
    region: 'Lower Limb - Leg',
    articulations: ['Femur (knee joint)', 'Fibula (proximal and distal tibiofibular joints)', 'Talus (ankle joint)'],
    innervation: 'Deep fibular nerve, tibial nerve',
    bloodSupply: 'Anterior tibial artery, posterior tibial artery, nutrient artery'
  }
);

addPairedBone(
  'Fibula',
  'Fibula',
  ['Calf bone'],
  'The fibula is the slender, lateral bone of the leg. It bears little weight but provides muscle attachment and forms the lateral malleolus (lateral ankle prominence). The common fibular nerve wraps around its neck and is vulnerable to injury there.',
  {
    boneType: 'long',
    region: 'Lower Limb - Leg',
    articulations: ['Tibia (proximal and distal tibiofibular joints)', 'Talus (ankle joint)'],
    innervation: 'Common fibular nerve at fibular neck',
    bloodSupply: 'Fibular (peroneal) artery'
  }
);

// Tarsal bones (14 - 7 per foot)
const tarsals = [
  { name: 'Talus', latin: 'Talus', aliases: ['Astragalus', 'Ankle bone'], description: 'The talus is the second largest tarsal bone, forming the ankle joint with the tibia and fibula. It has no muscle attachments. The body articulates superiorly with the leg bones, inferiorly with the calcaneus, and anteriorly with the navicular. Blood supply is tenuous, risking avascular necrosis after fractures.', articulations: ['Tibia', 'Fibula', 'Calcaneus', 'Navicular'] },
  { name: 'Calcaneus', latin: 'Calcaneus', aliases: ['Heel bone', 'Os calcis'], description: 'The calcaneus is the largest tarsal bone, forming the heel. It bears body weight and provides attachment for the Achilles tendon posteriorly. The sustentaculum tali supports the talus medially. Calcaneal fractures typically result from falls from height.', articulations: ['Talus', 'Cuboid'] },
  { name: 'Navicular', latin: 'Os naviculare', aliases: ['Scaphoid of foot'], description: 'The navicular is a boat-shaped tarsal bone on the medial side of the foot. It articulates with the talus proximally and the three cuneiforms distally. The tuberosity is palpable medially and may be prominent (accessory navicular). It is important in maintaining the medial longitudinal arch.', articulations: ['Talus', 'Medial cuneiform', 'Intermediate cuneiform', 'Lateral cuneiform'] },
  { name: 'Medial Cuneiform', latin: 'Os cuneiforme mediale', aliases: ['First cuneiform'], description: 'The medial cuneiform is the largest of the three cuneiforms, located on the medial side of the foot. It articulates with the navicular proximally and the first metatarsal distally. It forms a key part of the transverse arch.', articulations: ['Navicular', 'First metatarsal', 'Second metatarsal', 'Intermediate cuneiform'] },
  { name: 'Intermediate Cuneiform', latin: 'Os cuneiforme intermedium', aliases: ['Second cuneiform', 'Middle cuneiform'], description: 'The intermediate cuneiform is the smallest cuneiform, wedged between the medial and lateral cuneiforms. It articulates with the second metatarsal distally and contributes to the transverse arch of the foot.', articulations: ['Navicular', 'Medial cuneiform', 'Lateral cuneiform', 'Second metatarsal'] },
  { name: 'Lateral Cuneiform', latin: 'Os cuneiforme laterale', aliases: ['Third cuneiform'], description: 'The lateral cuneiform is located between the intermediate cuneiform and cuboid. It articulates with the third metatarsal distally and participates in the Lisfranc joint complex.', articulations: ['Navicular', 'Intermediate cuneiform', 'Cuboid', 'Third metatarsal'] },
  { name: 'Cuboid', latin: 'Os cuboideum', aliases: ['Cuboid bone'], description: 'The cuboid is a cube-shaped bone on the lateral side of the foot. It articulates with the calcaneus proximally and the 4th and 5th metatarsals distally. A groove on its plantar surface houses the peroneus longus tendon.', articulations: ['Calcaneus', 'Lateral cuneiform', 'Fourth metatarsal', 'Fifth metatarsal'] }
];

['Left', 'Right'].forEach(side => {
  tarsals.forEach(tarsal => {
    bones.push({
      name: `${side} ${tarsal.name}`,
      latinName: `${tarsal.latin} ${side === 'Left' ? 'sinister' : 'dexter'}`,
      aliases: tarsal.aliases.map(a => `${side} ${a}`),
      system: 'SKELETAL',
      description: tarsal.description,
      metadata: {
        boneType: 'short',
        region: 'Lower Limb - Foot (Tarsus)',
        articulations: tarsal.articulations,
        bloodSupply: 'Dorsalis pedis artery, posterior tibial artery, medial and lateral plantar arteries',
        side: side.toLowerCase() as 'left' | 'right'
      }
    });
  });
});

// Metatarsals (10 - 5 per foot)
['Left', 'Right'].forEach(side => {
  for (let i = 1; i <= 5; i++) {
    const ordinal = ['First', 'Second', 'Third', 'Fourth', 'Fifth'][i-1];
    const toeName = ['Great toe', 'Second toe', 'Third toe', 'Fourth toe', 'Little toe'][i-1];
    
    bones.push({
      name: `${side} Metatarsal ${i}`,
      latinName: `Os metatarsale ${i} ${side === 'Left' ? 'sinister' : 'dexter'}`,
      aliases: [`${side} ${ordinal} metatarsal`],
      system: 'SKELETAL',
      description: `The ${ordinal.toLowerCase()} metatarsal connects the tarsus to the ${toeName.toLowerCase()}. It has a base, shaft, and head (forming the ball of the foot). ${i === 1 ? 'The first metatarsal is the shortest and thickest, bearing significant weight during push-off.' : ''} ${i === 2 ? 'The second metatarsal is often the longest and its base is recessed into the cuneiforms (keystone of Lisfranc joint).' : ''} ${i === 5 ? 'The fifth metatarsal has a prominent tuberosity (styloid process) at its base, a common fracture site (Jones fracture, avulsion fracture).' : ''}`,
      metadata: {
        boneType: 'long',
        region: 'Lower Limb - Foot (Metatarsus)',
        articulations: [
          ...(i === 1 ? ['Medial cuneiform'] : i === 2 ? ['Intermediate cuneiform', 'Medial cuneiform', 'Lateral cuneiform'] : i === 3 ? ['Lateral cuneiform'] : i === 4 ? ['Cuboid', 'Lateral cuneiform'] : ['Cuboid']),
          `Proximal phalanx of ${toeName.toLowerCase()}`
        ],
        innervation: i === 1 ? 'Medial plantar nerve' : 'Lateral plantar nerve',
        bloodSupply: 'Dorsal metatarsal arteries, plantar metatarsal arteries',
        side: side.toLowerCase() as 'left' | 'right'
      }
    });
  }
});

// Foot phalanges (28 - 14 per foot)
['Left', 'Right'].forEach(side => {
  const toes = ['Great Toe', 'Second Toe', 'Third Toe', 'Fourth Toe', 'Little Toe'];
  
  toes.forEach((toe, idx) => {
    const toeNum = idx + 1;
    const isGreatToe = toeNum === 1;
    const phalanxTypes = isGreatToe ? ['Proximal', 'Distal'] : ['Proximal', 'Middle', 'Distal'];
    
    phalanxTypes.forEach((type) => {
      bones.push({
        name: `${side} ${toe} ${type} Phalanx`,
        latinName: `Phalanx ${type.toLowerCase()} digiti ${toeNum === 1 ? 'hallucis' : toeNum === 2 ? 'secundi' : toeNum === 3 ? 'tertii' : toeNum === 4 ? 'quarti' : 'minimi'} pedis ${side === 'Left' ? 'sinister' : 'dexter'}`,
        aliases: [`${side} ${type.toLowerCase()} phalanx of ${toe.toLowerCase()}`],
        system: 'SKELETAL',
        description: `The ${type.toLowerCase()} phalanx of the ${toe.toLowerCase()} is ${type === 'Proximal' ? 'the largest phalanx of this toe, articulating with the metatarsal head' : type === 'Middle' ? 'located between the proximal and distal phalanges (absent in great toe)' : 'the terminal bone bearing the toenail'}. ${isGreatToe ? 'The great toe has only two phalanges, contributing to its role in balance and push-off during gait.' : 'The lesser toe phalanges are small and may fuse with age.'}`,
        metadata: {
          boneType: 'long',
          region: 'Lower Limb - Foot (Phalanges)',
          articulations: type === 'Proximal' 
            ? [`Metatarsal ${toeNum}`, isGreatToe ? 'Distal phalanx' : 'Middle phalanx']
            : type === 'Middle' 
              ? ['Proximal phalanx', 'Distal phalanx']
              : [isGreatToe ? 'Proximal phalanx' : 'Middle phalanx'],
          innervation: toeNum === 1 || (toeNum === 2 && type === 'Proximal') ? 'Medial plantar nerve' : 'Lateral plantar nerve',
          bloodSupply: 'Plantar digital arteries',
          side: side.toLowerCase() as 'left' | 'right'
        }
      });
    });
  });
});

// Generate the output
const output = {
  version: '1.0.0',
  generatedAt: new Date().toISOString(),
  totalBones: bones.length,
  description: 'Comprehensive anatomical reference for all 206 bones of the adult human skeleton',
  structures: bones
};

// Ensure directory exists and write file
const outputPath = path.join(__dirname, '..', 'prisma', 'data', 'anatomical-reference.json');
const outputDir = path.dirname(outputPath);

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));

console.log(`✅ Successfully generated anatomical-reference.json`);
console.log(`📊 Total bones: ${bones.length}`);
console.log(`📁 Output: ${outputPath}`);

// Verify counts
const regions: { [key: string]: number } = {};
bones.forEach(bone => {
  const region = bone.metadata.region;
  regions[region] = (regions[region] || 0) + 1;
});

console.log('\n📋 Bone count by region:');
Object.entries(regions).sort((a, b) => b[1] - a[1]).forEach(([region, count]) => {
  console.log(`   ${region}: ${count}`);
});
