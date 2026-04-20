/**
 * Mapping from old PascalCase SVG IDs to new kebab-case data-svg-id values
 * Used in migration to update svgPathIds in the database
 */
export const OLD_TO_NEW_SVG_ID_MAPPING: Record<string, string> = {
  // Feet & Ankles
  FootLeft: "foot-left",
  FootRight: "foot-right",
  TarsalsLeft: "tarsals-left",
  TarsalsRight: "tarsals-right",
  MetatarsalsLeft: "metatarsals-left",
  MetatarsalsRight: "metatarsals-right",
  PhalangesFootLeft: "phalanges-left",
  PhalangesFootRight: "phalanges-right",

  // Legs
  FemurLeft: "femur-left",
  FemurRight: "femur", // Note: in SVG just "femur"
  Femur: "femur",
  TibiaLeft: "tibia-left",
  TibiaRight: "tibia-right",
  Tibia: "tibia",
  FibulaLeft: "fibula",
  FibulaRight: "fibula-right",
  Fibula: "fibula",
  PatellaLeft: "patella-left",
  PatellaRight: "patella-right",

  // Joints
  KneeJointLeft: "knee-joint-left",
  KneeJointRight: "knee-joint-right",
  HipJoint: "hip-joint",
  HipJointRight: "hip-joint-right",

  // Pelvis
  Pelvis: "pelvis",
  PelvicGirdle: "", // Empty in new SVG

  // Spine
  Sacrum: "sacrum",
  Coccyx: "coccyx",
  LumbarVertebrae: "lumbar-vertebrae",
  ThoracicVertebrae: "thoracic-vertebrae",
  CervicalVertebrae: "cervical-vertebrae",

  // Chest
  Sternum: "sternum",
  Manubrium: "manubrium",
  Ribcage: "ribcage",

  // Head
  Skull: "skull",
  Mandible: "mandible",
  Teeth: "teeth",
  Cranium: "cranium",

  // Shoulders
  Scapula: "scapula",
  ScapulaLeft: "scapular-left",
  ScapulaRight: "scapula-right",
  ClavicleLeft: "clavicle-left",
  ClavicleRight: "clavicle-right",

  // Upper Arms
  HumerusLeft: "humerus-left",
  HumerusRight: "humerus-right",

  // Forearms
  RadiusLeft: "radius-left",
  RadiusRight: "radius-right",
  UlnaLeft: "ulna-left",
  UlnaRight: "ulna-right",

  // Hands
  HandLeft: "hand-left",
  HandRight: "hand-right",
  CarpalsLeft: "carpals-left",
  CarpalsRight: "carpals-right",
  MetacarpalsLeft: "metacarpals-left",
  MetacarpalsRight: "metacarpals-right",
  PhalangesLeft: "phalenges-left", // Note: typo in SVG
  PhalangesRight: "phalanges-right",
  PhalengesLeft: "phalenges-left", // Alternative spelling
};

/**
 * Convert old SVG ID to new data-svg-id
 */
export function mapOldIdToNew(oldId: string): string {
  return OLD_TO_NEW_SVG_ID_MAPPING[oldId] || oldId; // Return oldId as fallback
}

/**
 * Convert array of old IDs to new IDs
 */
export function mapOldIdsToNew(oldIds: string[]): string[] {
  return oldIds
    .map((id) => mapOldIdToNew(id))
    .filter((id) => id !== ""); // Filter out empty strings (e.g., PelvicGirdle)
}
