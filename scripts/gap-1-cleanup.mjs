#!/usr/bin/env node

/**
 * GAP #1: Remove bones with no SVG representation
 * Removes: Frontal Bone, Occipital Bone, Ethmoid Bone, Sphenoid Bone, Vomer, Hyoid Bone
 */

import fs from 'fs';

const bonesPath = 'prisma/data/bones.json';
const bones = JSON.parse(fs.readFileSync(bonesPath, 'utf-8'));

const namesToRemove = [
  'Frontal Bone',
  'Occipital Bone',
  'Ethmoid Bone',
  'Sphenoid Bone',
  'Vomer',
  'Hyoid Bone',
];

const beforeCount = bones.length;
const filtered = bones.filter((bone) => !namesToRemove.includes(bone.name));
const removedCount = beforeCount - filtered.length;

console.log(`🗑️  Removing ${removedCount} bones:`);
for (const name of namesToRemove) {
  const bone = bones.find((b) => b.name === name);
  if (bone) {
    console.log(`   ✅ Removed: ${bone.name}`);
  } else {
    console.log(`   ⚠️  Not found: ${name}`);
  }
}

fs.writeFileSync(bonesPath, JSON.stringify(filtered, null, 2) + '\n');
console.log(`\n✅ Updated bones.json: ${beforeCount} → ${filtered.length} bones`);
