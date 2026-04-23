#!/usr/bin/env node

/**
 * Gap #1 Fix: Remove 9 non-SVG bones from bones.json
 * 
 * These bones don't have corresponding SVG groups:
 * 1. Phalanges Foot Left
 * 2. Phalanges Foot Right
 * 3. Pelvic Girdle
 * 4. Frontal Bone
 * 5. Occipital Bone
 * 6. Ethmoid Bone
 * 7. Sphenoid Bone
 * 8. Vomer
 * 9. Hyoid Bone
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BONES_TO_REMOVE = [
  'Phalanges Foot Left',
  'Phalanges Foot Right',
  'Pelvic Girdle',
  'Frontal Bone',
  'Occipital Bone',
  'Ethmoid Bone',
  'Sphenoid Bone',
  'Vomer',
  'Hyoid Bone',
];

function removeBonesFromJson() {
  const filePath = path.join(__dirname, '../prisma/data/bones.json');
  
  console.log('📋 Reading bones.json...');
  const content = fs.readFileSync(filePath, 'utf-8');
  let bones = JSON.parse(content);
  
  console.log(`📊 Total bones before: ${bones.length}`);
  
  // Filter out the bones we want to remove
  const originalCount = bones.length;
  bones = bones.filter((bone) => !BONES_TO_REMOVE.includes(bone.name));
  
  const removed = originalCount - bones.length;
  console.log(`🗑️  Removed: ${removed} bones`);
  console.log(`📊 Total bones after: ${bones.length}`);
  
  if (removed !== BONES_TO_REMOVE.length) {
    console.error(
      `⚠️  WARNING: Expected to remove ${BONES_TO_REMOVE.length} bones, but removed ${removed}`
    );
  }
  
  // List what was removed
  console.log('\n🔍 Removed bones:');
  for (const boneName of BONES_TO_REMOVE) {
    console.log(`   - ${boneName}`);
  }
  
  // Write back to file
  fs.writeFileSync(filePath, JSON.stringify(bones, null, 2));
  console.log(`\n✅ Updated bones.json (${bones.length} bones)`);
  
  return bones.length;
}

try {
  const finalCount = removeBonesFromJson();
  process.exit(finalCount === 121 ? 0 : 1);
} catch (error) {
  console.error('❌ Error:', error);
  process.exit(1);
}
