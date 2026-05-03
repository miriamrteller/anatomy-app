-- Migrate SVG path IDs from old PascalCase to new kebab-case data-svg-id format
-- This migration updates all structures to use the new data-svg-id values from skeleton.svg

BEGIN;

-- Create a temporary mapping table for the conversion
CREATE TEMP TABLE svg_id_mapping (
  old_id TEXT NOT NULL PRIMARY KEY,
  new_id TEXT NOT NULL
);

-- Insert all mappings
INSERT INTO svg_id_mapping (old_id, new_id) VALUES
-- Feet & Ankles
('FootLeft', 'foot-left'),
('FootRight', 'foot-right'),
('TarsalsLeft', 'tarsals-left'),
('TarsalsRight', 'tarsals-right'),
('MetatarsalsLeft', 'metatarsals-left'),
('MetatarsalsRight', 'metatarsals-right'),
('PhalangesFootLeft', 'phalanges-left'),
('PhalangesFootRight', 'phalanges-right'),

-- Legs
('FemurLeft', 'femur-left'),
('FemurRight', 'femur'),
('Femur', 'femur'),
('TibiaLeft', 'tibia-left'),
('TibiaRight', 'tibia-right'),
('Tibia', 'tibia'),
('FibulaLeft', 'fibula'),
('FibulaRight', 'fibula-right'),
('Fibula', 'fibula'),
('PatellaLeft', 'patella-left'),
('PatellaRight', 'patella-right'),

-- Joints
('KneeJointLeft', 'knee-joint-left'),
('KneeJointRight', 'knee-joint-right'),
('HipJoint', 'hip-joint'),
('HipJointRight', 'hip-joint-right'),

-- Pelvis
('Pelvis', 'pelvis'),
('PelvicGirdle', ''),

-- Spine
('Sacrum', 'sacrum'),
('Coccyx', 'coccyx'),
('LumbarVertebrae', 'lumbar-vertebrae'),
('ThoracicVertebrae', 'thoracic-vertebrae'),
('CervicalVertebrae', 'cervical-vertebrae'),

-- Chest
('Sternum', 'sternum'),
('Manubrium', 'manubrium'),
('Ribcage', 'ribcage'),

-- Head
('Skull', 'skull'),
('Mandible', 'mandible'),
('Teeth', 'teeth'),
('Cranium', 'cranium'),

-- Shoulders
('Scapula', 'scapula'),
('ScapulaLeft', 'scapular-left'),
('ScapulaRight', 'scapula-right'),
('ClavicleLeft', 'clavicle-left'),
('ClavicleRight', 'clavicle-right'),

-- Upper Arms
('HumerusLeft', 'humerus-left'),
('HumerusRight', 'humerus-right'),

-- Forearms
('RadiusLeft', 'radius-left'),
('RadiusRight', 'radius-right'),
('UlnaLeft', 'ulna-left'),
('UlnaRight', 'ulna-right'),

-- Hands
('HandLeft', 'hand-left'),
('HandRight', 'hand-right'),
('CarpalsLeft', 'carpals-left'),
('CarpalsRight', 'carpals-right'),
('MetacarpalsLeft', 'metacarpals-left'),
('MetacarpalsRight', 'metacarpals-right'),
('PhalangesLeft', 'phalenges-left'),
('PhalangesRight', 'phalanges-right'),
('PhalengesLeft', 'phalenges-left');

-- Update structures table: convert each SVG path ID in the array
UPDATE structures
SET "svgPathIds" = (
  SELECT ARRAY_AGG(COALESCE(m.new_id, u.old_id))
  FROM UNNEST("svgPathIds") AS u(old_id)
  LEFT JOIN svg_id_mapping m ON u.old_id = m.old_id
  WHERE COALESCE(m.new_id, u.old_id) != ''
)
WHERE "svgPathIds" != ARRAY[]::TEXT[];

COMMIT;
