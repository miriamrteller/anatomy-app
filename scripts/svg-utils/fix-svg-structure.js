#!/usr/bin/env node

/**
 * SVG Structure Fixer
 * Shows which paths need to be moved to create proper anatomical groups
 * 
 * Usage:
 *   node scripts/svg-utils/fix-svg-structure.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { XMLParser } from 'fast-xml-parser';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, '../..');

// Parse bones.json
const bonesPath = path.join(projectRoot, 'prisma/data/bones.json');
const bonesData = JSON.parse(fs.readFileSync(bonesPath, 'utf8'));

// Create lookup: svgPathId -> bone name
const svgPathToBone = {};
const expectedSvgIds = new Set();
bonesData.forEach(bone => {
  const pathIds = bone.svgPathIds?.SKELETAL || [];
  pathIds.forEach(pathId => {
    svgPathToBone[pathId] = bone.name;
    expectedSvgIds.add(pathId);
  });
});

// Parse skeleton.svg
const svgPath = path.join(projectRoot, 'frontend/public/svgs/skeleton.svg');
const svgContent = fs.readFileSync(svgPath, 'utf8');

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
});

const svgDoc = parser.parse(svgContent);

/**
 * Find all groups and their paths
 */
function analyzeAllGroups() {
  const groups = [];

  function walk(element, parentChain = []) {
    if (!element) return;

    if (element['@_id']) {
      const groupId = element['@_id'];
      const label = element['@_inkscape:label'] || element['@_label'] || '';

      // Collect all paths under this group
      const paths = [];

      function collectPaths(el) {
        if (!el) return;
        if (el.path) {
          const pathArray = Array.isArray(el.path) ? el.path : [el.path];
          pathArray.forEach(p => {
            paths.push({
              id: p['@_id'] || '(no id)',
            });
          });
        }
        if (el.g) {
          const childArray = Array.isArray(el.g) ? el.g : [el.g];
          childArray.forEach(g => collectPaths(g));
        }
      }

      collectPaths(element);

      groups.push({
        id: groupId,
        label,
        paths,
        mapped: svgPathToBone[groupId] ? true : false,
        bone: svgPathToBone[groupId],
      });
    }

    // Recurse
    if (element.g) {
      const children = Array.isArray(element.g) ? element.g : [element.g];
      children.forEach(child => walk(child, [...parentChain, element['@_id']]));
    }
  }

  const svgElement = svgDoc.svg;
  const rootGroups = Array.isArray(svgElement.g) ? svgElement.g : [svgElement.g];
  rootGroups.forEach(g => walk(g));

  return groups;
}

// Main analysis
const allGroups = analyzeAllGroups();

console.log('\n═══════════════════════════════════════════════════════════════');
console.log('SVG STRUCTURE ANALYSIS');
console.log('═══════════════════════════════════════════════════════════════\n');

// Show missing groups
console.log('❌ MISSING GROUP IDs (Expected but not in SVG):\n');
const missingGroups = Array.from(expectedSvgIds).filter(
  id => !allGroups.find(g => g.id === id)
);
missingGroups.forEach(id => {
  const bone = svgPathToBone[id];
  console.log(`  • ${id.padEnd(25)} (for: ${bone})`);
});

// Show orphaned groups (in SVG but not mapped to any bone)
console.log(`\n⚠️  ORPHANED GROUPS (in SVG but not mapped to any bone):\n`);
const orphanedGroups = allGroups.filter(g => !g.mapped);
orphanedGroups.forEach(g => {
  console.log(`  • ${g.id.padEnd(25)} [${g.paths.length} paths]`);
  if (g.paths.length > 0 && g.paths.length <= 5) {
    g.paths.forEach(p => console.log(`      - ${p.id}`));
  }
});

// Show properly mapped groups
console.log(`\n✓ PROPERLY MAPPED GROUPS:\n`);
const mappedGroups = allGroups.filter(g => g.mapped);
mappedGroups.forEach(g => {
  console.log(`  • ${g.id.padEnd(25)} → ${g.bone} [${g.paths.length} paths]`);
});

// Summary and recommendations
console.log('\n═══════════════════════════════════════════════════════════════');
console.log('RECOMMENDATIONS:');
console.log('═══════════════════════════════════════════════════════════════\n');

if (missingGroups.length > 0) {
  console.log(`1. CREATE ${missingGroups.length} NEW GROUP IDs:\n`);
  missingGroups.forEach(id => {
    const bone = svgPathToBone[id];
    console.log(`   <g id="${id}"><!-- ${bone} -->`);
    console.log(`     <!-- Move related paths here -->`);
    console.log(`   </g>\n`);
  });
}

if (orphanedGroups.length > 0) {
  console.log(`2. AUDIT OR RENAME ${orphanedGroups.length} ORPHANED GROUPS:\n`);
  orphanedGroups.forEach(g => {
    console.log(`   • layer3, layer4, Layer_1 are Inkscape organizational layers`);
    console.log(`     → Move paths to correct anatomical group IDs`);
    if (g.id === 'layer3') {
      console.log(`     → "layer3" contains: ${g.paths.length} paths`);
    }
  });
}

console.log(`\n3. NEXT STEPS:\n`);
console.log(`   a) Run: node scripts/svg-utils/inspect-svg-hierarchy.js layer3`);
console.log(`   b) Open skeleton.svg in VS Code as TEXT (right-click → "Open With")`);
console.log(`   c) Find the missing group IDs in the file (Ctrl+F)`);
console.log(`   d) Create new <g> elements with proper ids if they don't exist`);
console.log(`   e) Move orphaned paths from layer3/layer4 to their proper groups\n`);

console.log('═══════════════════════════════════════════════════════════════\n');
