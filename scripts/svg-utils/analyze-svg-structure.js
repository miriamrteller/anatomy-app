#!/usr/bin/env node

/**
 * SVG Structure Analyzer
 * Identifies which SVG paths belong to anatomical groups and detects misalignments
 * 
 * Usage:
 *   node scripts/svg-utils/analyze-svg-structure.js [search-term]
 *   node scripts/svg-utils/analyze-svg-structure.js FemurRight
 *   node scripts/svg-utils/analyze-svg-structure.js Skull
 *   node scripts/svg-utils/analyze-svg-structure.js layer3
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { XMLParser } from 'fast-xml-parser';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, '../..');

// Parse bones.json to get expected SVG path mappings
const bonesPath = path.join(projectRoot, 'prisma/data/bones.json');
const bonesData = JSON.parse(fs.readFileSync(bonesPath, 'utf8'));

// Create lookup: svgPathId -> bone name
const svgPathToBone = {};
bonesData.forEach(bone => {
  const pathIds = bone.svgPathIds?.SKELETAL || [];
  pathIds.forEach(pathId => {
    svgPathToBone[pathId] = bone.name;
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
 * Recursively find all elements in SVG hierarchy
 */
function findAllElements(element, depth = 0) {
  const results = [];

  if (!element) return results;

  // Handle single element or array
  const elements = Array.isArray(element) ? element : [element];

  elements.forEach(el => {
    if (!el) return;

    // Check if this is a group or path
    if (el['@_id']) {
      results.push({
        depth,
        tag: Object.keys(el)[0],
        id: el['@_id'],
        label: el['@_inkscape:label'] || el['@_label'] || '',
        childCount: (el.g?.length || 0) + (el.path?.length || 0),
        element: el,
      });
    }

    // Recurse into groups
    if (el.g) {
      const children = Array.isArray(el.g) ? el.g : [el.g];
      children.forEach(child => {
        results.push(...findAllElements(child, depth + 1));
      });
    }
  });

  return results;
}

/**
 * Find all paths under a specific group
 */
function findPathsInGroup(groupId) {
  const svgElement = svgDoc.svg;
  const groups = Array.isArray(svgElement.g) ? svgElement.g : [svgElement.g];

  function searchGroup(group, targetId, parentChain = []) {
    if (!group) return null;

    if (group['@_id'] === targetId) {
      return { group, parentChain };
    }

    if (group.g) {
      const children = Array.isArray(group.g) ? group.g : [group.g];
      for (const child of children) {
        const result = searchGroup(child, targetId, [...parentChain, group['@_id']]);
        if (result) return result;
      }
    }

    return null;
  }

  let result = null;
  for (const group of groups) {
    result = searchGroup(group, groupId);
    if (result) break;
  }

  if (!result) return null;

  const found = result.group;
  const paths = [];

  function collectPaths(el) {
    if (!el) return;
    if (el.path) {
      const pathArray = Array.isArray(el.path) ? el.path : [el.path];
      pathArray.forEach(p => {
        paths.push({
          id: p['@_id'] || '(no id)',
          d: (p['@_d'] || '').substring(0, 50) + '...',
        });
      });
    }
    if (el.g) {
      const childArray = Array.isArray(el.g) ? el.g : [el.g];
      childArray.forEach(g => collectPaths(g));
    }
  }

  collectPaths(found);
  return { found, paths, parentChain: result.parentChain };
}

/**
 * Find which group a specific path belongs to
 */
function findPathParent(pathId) {
  const svgElement = svgDoc.svg;
  const groups = Array.isArray(svgElement.g) ? svgElement.g : [svgElement.g];

  function searchPath(element, chain = []) {
    if (!element) return null;

    // Check paths in this element
    if (element.path) {
      const pathArray = Array.isArray(element.path) ? element.path : [element.path];
      for (const p of pathArray) {
        if (p['@_id'] === pathId) {
          return { chain, parentId: element['@_id'] };
        }
      }
    }

    // Recurse into groups
    if (element.g) {
      const childArray = Array.isArray(element.g) ? element.g : [element.g];
      for (const child of childArray) {
        const result = searchPath(child, [...chain, element['@_id']]);
        if (result) return result;
      }
    }

    return null;
  }

  for (const group of groups) {
    const result = searchPath(group);
    if (result) return result;
  }

  return null;
}

/**
 * Main analysis
 */
const searchTerm = process.argv[2];

console.log('\n═══════════════════════════════════════════════════════════════');
console.log('SVG STRUCTURE ANALYZER');
console.log('═══════════════════════════════════════════════════════════════\n');

if (!searchTerm) {
  console.log('USAGE: node scripts/svg-utils/analyze-svg-structure.js [search-term]\n');
  console.log('AVAILABLE SVG GROUP IDs:');
  const allElements = findAllElements(svgDoc.svg);
  allElements.forEach(el => {
    if (el.id && !el.id.match(/^g\d+$/)) {
      const bone = svgPathToBone[el.id];
      console.log(`  • ${el.id.padEnd(20)} ${bone ? `→ ${bone}` : '(orphaned)'}`);
    }
  });
  process.exit(0);
}

// Search for the term in both group IDs and path IDs
console.log(`SEARCHING FOR: "${searchTerm}"\n`);

// Check if it's a group ID
const groupInfo = findPathsInGroup(searchTerm);
if (groupInfo) {
  console.log(`✓ FOUND GROUP: <g id="${searchTerm}">`);
  console.log(`  Parent chain: ${groupInfo.parentChain.join(' > ') || '(root)'}`);
  console.log(`  Contains ${groupInfo.paths.length} paths:\n`);
  groupInfo.paths.forEach((p, i) => {
    const bone = svgPathToBone[p.id];
    console.log(`    ${i + 1}. ${p.id.padEnd(15)} ${bone ? `✓ Maps to: ${bone}` : '✗ Not in bones.json'}`);
  });
} else {
  // Check if it's a path ID
  const pathInfo = findPathParent(searchTerm);
  if (pathInfo) {
    console.log(`✓ FOUND PATH: <path id="${searchTerm}"/>`);
    console.log(`  Currently in group: ${pathInfo.chain.join(' > ')}`);
  } else {
    console.log(`✗ NOT FOUND in SVG`);
    console.log('\nDid you mean one of these?');
    const similar = findAllElements(svgDoc.svg).filter(el =>
      el.id && el.id.toLowerCase().includes(searchTerm.toLowerCase())
    );
    similar.slice(0, 10).forEach(el => {
      console.log(`  • ${el.id}`);
    });
  }
}

// Show if this group ID is expected in bones.json
if (searchTerm && svgPathToBone[searchTerm]) {
  const bone = svgPathToBone[searchTerm];
  console.log(`\nEXPECTED IN DATABASE:`);
  console.log(`  Bone: ${bone}`);
  const boneRecord = bonesData.find(b => b.name === bone);
  if (boneRecord) {
    console.log(`  Expected SVG IDs: ${boneRecord.svgPathIds?.SKELETAL?.join(', ')}`);
  }
}

// Show orphaned layer3 detection
if (searchTerm?.toLowerCase().includes('layer')) {
  console.log(`\n✗ WARNING: "layer3" is an Inkscape organizational layer, not an anatomical structure.`);
  console.log(`  If paths are incorrectly nested under "layer3", they should be moved to their`);
  console.log(`  proper anatomical group IDs (e.g., "FemurRight", "Skull", etc.)`);
}

console.log('\n═══════════════════════════════════════════════════════════════\n');
