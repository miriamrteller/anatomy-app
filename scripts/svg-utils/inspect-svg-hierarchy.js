#!/usr/bin/env node

/**
 * SVG Hierarchy Inspector
 * Shows the detailed nested structure of groups and paths
 * 
 * Usage:
 *   node scripts/svg-utils/inspect-svg-hierarchy.js [group-id]
 *   node scripts/svg-utils/inspect-svg-hierarchy.js layer3
 *   node scripts/svg-utils/inspect-svg-hierarchy.js Skull
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { XMLParser } from 'fast-xml-parser';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, '../..');

// Parse skeleton.svg
const svgPath = path.join(projectRoot, 'frontend/public/svgs/skeleton.svg');
const svgContent = fs.readFileSync(svgPath, 'utf8');

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  parseAttributeValue: false,
});

const svgDoc = parser.parse(svgContent);

// Parse bones.json for reference
const bonesPath = path.join(projectRoot, 'prisma/data/bones.json');
const bonesData = JSON.parse(fs.readFileSync(bonesPath, 'utf8'));
const svgPathToBone = {};
bonesData.forEach(bone => {
  const pathIds = bone.svgPathIds?.SKELETAL || [];
  pathIds.forEach(pathId => {
    svgPathToBone[pathId] = bone.name;
  });
});

/**
 * Find and display hierarchy of a group
 */
function inspectGroup(groupId) {
  const svgElement = svgDoc.svg;
  const groups = Array.isArray(svgElement.g) ? svgElement.g : [svgElement.g];

  let foundGroup = null;

  function searchGroup(group, targetId) {
    if (!group) return null;
    if (group['@_id'] === targetId) {
      return group;
    }
    if (group.g) {
      const children = Array.isArray(group.g) ? group.g : [group.g];
      for (const child of children) {
        const result = searchGroup(child, targetId);
        if (result) return result;
      }
    }
    return null;
  }

  for (const group of groups) {
    foundGroup = searchGroup(group, groupId);
    if (foundGroup) break;
  }

  if (!foundGroup) {
    return null;
  }

  return foundGroup;
}

/**
 * Recursively print tree structure
 */
function printTree(element, indent = 0, depth = 0, maxDepth = 6) {
  if (!element || depth > maxDepth) return;

  const prefix = '  '.repeat(indent);

  if (element['@_id']) {
    const id = element['@_id'];
    const label = element['@_inkscape:label'] || '';
    const bone = svgPathToBone[id];
    const mapped = bone ? `✓ ${bone}` : '✗ orphaned';

    console.log(
      `${prefix}📦 <g id="${id}"> ${label ? `[${label}]` : ''} ${mapped}`,
    );
  }

  // Count and show paths
  if (element.path) {
    const pathArray = Array.isArray(element.path) ? element.path : [element.path];
    if (pathArray.length > 0) {
      console.log(`${prefix}  ├─ 📄 ${pathArray.length} paths`);
    }
  }

  // Recurse into child groups
  if (element.g) {
    const childArray = Array.isArray(element.g) ? element.g : [element.g];
    childArray.forEach((child, i) => {
      if (child.forEach) return; // Skip if somehow iterating wrong
      printTree(child, indent + 1, depth + 1, maxDepth);
    });
  }
}

// Main
const groupId = process.argv[2] || 'layer3';

console.log('\n═══════════════════════════════════════════════════════════════');
console.log('SVG HIERARCHY INSPECTOR');
console.log('═══════════════════════════════════════════════════════════════\n');

const group = inspectGroup(groupId);

if (!group) {
  console.log(`✗ Group not found: ${groupId}\n`);
  console.log('Run: node scripts/svg-utils/analyze-svg-structure.js');
  console.log('to see all available group IDs.\n');
  process.exit(1);
}

console.log(`📊 HIERARCHY OF: <g id="${groupId}">\n`);
printTree(group);

console.log(
  '\n═══════════════════════════════════════════════════════════════\n',
);
console.log('KEY:');
console.log('  ✓ = mapped to a bone in bones.json');
console.log('  ✗ = orphaned (not mapped to any bone)');
console.log('  📦 = group element <g>');
console.log('  📄 = path elements <path>\n');

console.log('💡 IF ALL SUB-GROUPS ARE CORRECT:');
console.log(`  You may not need to move anything. layer3 is likely just a`);
console.log(`  container in Inkscape. The issue might be in bones.json mapping.\n`);

console.log('💡 IF SUB-GROUPS ARE ORPHANED:');
console.log(`  You need to either rename them to match expected IDs or`);
console.log(`  update bones.json to include them.\n`);

console.log('═══════════════════════════════════════════════════════════════\n');
