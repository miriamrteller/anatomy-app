#!/usr/bin/env node

/**
 * SVG Path Mover
 * Generates exact find/replace operations to move paths from orphaned layers to proper groups
 * 
 * Usage:
 *   node scripts/svg-utils/move-svg-paths.js [layer-to-fix] [target-group-id]
 *   node scripts/svg-utils/move-svg-paths.js layer3           # Analyze layer3 and suggest moves
 *   node scripts/svg-utils/move-svg-paths.js layer3 FemurRight # Move all layer3 paths to FemurRight
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { XMLParser, XMLBuilder } from 'fast-xml-parser';

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
  parseAttributeValue: false,
});

const svgDoc = parser.parse(svgContent);

/**
 * Find all paths in a specific group
 */
function getPathsInGroup(groupId) {
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

  if (!foundGroup) return [];

  const paths = [];

  function collectPaths(el) {
    if (!el) return;
    if (el.path) {
      const pathArray = Array.isArray(el.path) ? el.path : [el.path];
      pathArray.forEach(p => {
        paths.push({
          id: p['@_id'] || '(no id)',
          d: p['@_d'] || '',
        });
      });
    }
    if (el.g) {
      const childArray = Array.isArray(el.g) ? el.g : [el.g];
      childArray.forEach(g => collectPaths(g));
    }
  }

  collectPaths(foundGroup);
  return paths;
}

/**
 * Extract bounding box from SVG path data
 */
function getPathBounds(pathData) {
  if (!pathData) return null;
  // Simple extraction of first coordinate
  const match = pathData.match(/[\d\.\-]+/g);
  if (!match || match.length < 2) return null;
  return {
    x: parseFloat(match[0]),
    y: parseFloat(match[1]),
  };
}

/**
 * Guess which group paths should belong to based on coordinates
 */
function guessTargetGroup(paths) {
  if (paths.length === 0) return null;

  // Extract coordinates from paths
  const coords = paths
    .map(p => getPathBounds(p.d))
    .filter(c => c !== null);

  if (coords.length === 0) return null;

  // Calculate center
  const centerX = coords.reduce((sum, c) => sum + c.x, 0) / coords.length;
  const centerY = coords.reduce((sum, c) => sum + c.y, 0) / coords.length;

  // Heuristic mapping based on SVG canvas position
  // This is approximate - user should verify
  if (centerY < 100) return 'Skull'; // Top = head
  if (centerY > 700) return 'FootRight'; // Bottom = feet
  if (centerX < 300) return 'Left'; // Rough left side
  if (centerX > 400) return 'Right'; // Rough right side
  if (centerY > 250 && centerY < 450) return 'Femur'; // Middle = legs

  return null;
}

// Main
const layerToFix = process.argv[2] || 'layer3';
const targetGroup = process.argv[3];

console.log('\n═══════════════════════════════════════════════════════════════');
console.log('SVG PATH MOVER');
console.log('═══════════════════════════════════════════════════════════════\n');

const pathsInLayer = getPathsInGroup(layerToFix);

if (pathsInLayer.length === 0) {
  console.log(`✗ No paths found in: ${layerToFix}`);
  console.log('\nRun: node scripts/svg-utils/analyze-svg-structure.js');
  console.log('to see all available groups.\n');
  process.exit(1);
}

console.log(`ANALYZING: <g id="${layerToFix}">`);
console.log(`📊 Found ${pathsInLayer.length} paths\n`);

if (!targetGroup) {
  // Show analysis and suggestions
  const guessedTarget = guessTargetGroup(pathsInLayer);

  console.log('📋 PATHS IN THIS GROUP:\n');
  pathsInLayer.slice(0, 20).forEach((p, i) => {
    console.log(`  ${i + 1}. ${p.id}`);
  });

  if (pathsInLayer.length > 20) {
    console.log(`  ... and ${pathsInLayer.length - 20} more`);
  }

  console.log(`\n🔍 SUGGESTED TARGET GROUP: ${guessedTarget || '(manual inspection needed)'}`);
  console.log('\nAVAILABLE TARGET GROUPS (from bones.json):\n');
  Array.from(expectedSvgIds)
    .sort()
    .forEach(id => {
      const bone = svgPathToBone[id];
      console.log(`  • ${id.padEnd(25)} (${bone})`);
    });

  console.log(`\n💡 USAGE:\n`);
  console.log(`  node scripts/svg-utils/move-svg-paths.js ${layerToFix} FemurRight`);
  console.log(`  node scripts/svg-utils/move-svg-paths.js ${layerToFix} Skull`);
  console.log(`  node scripts/svg-utils/move-svg-paths.js ${layerToFix} FootRight\n`);

  console.log('═══════════════════════════════════════════════════════════════\n');
} else {
  // Generate move operations
  console.log(`🎯 TARGET GROUP: ${targetGroup}`);
  console.log(`📝 OPERATIONS TO PERFORM:\n`);

  // Verify target exists in bones.json
  if (!expectedSvgIds.has(targetGroup)) {
    console.log(`⚠️  WARNING: "${targetGroup}" is not in bones.json`);
    console.log(`   Expected groups: ${Array.from(expectedSvgIds).join(', ')}\n`);
    process.exit(1);
  }

  console.log(`OPTION 1: Using XML find/replace in VS Code`);
  console.log(`─────────────────────────────────────────`);
  console.log(`1. Open skeleton.svg in VS Code as TEXT (right-click → "Open With")`);
  console.log(`2. Use Find & Replace (Ctrl+H)`);
  console.log(`3. Find: <g id="${layerToFix}">`);
  console.log(`4. Replace with: <g id="${targetGroup}">`);
  console.log(`\nNOTE: This will move ALL ${pathsInLayer.length} paths at once.\n`);

  console.log(`OPTION 2: Using this script to generate the file`);
  console.log(`──────────────────────────────────────────────────`);
  console.log(`1. Run: node scripts/svg-utils/move-svg-paths.js ${layerToFix} ${targetGroup} --apply`);
  console.log(`2. This will modify skeleton.svg directly (creates backup)\n`);

  console.log(`OPTION 3: Manual verification (recommended)`);
  console.log(`─────────────────────────────────────────`);
  console.log(`Before moving, verify these ${pathsInLayer.length} paths are correct:\n`);
  pathsInLayer.slice(0, 10).forEach((p, i) => {
    console.log(`  ${i + 1}. ${p.id}`);
  });
  if (pathsInLayer.length > 10) {
    console.log(`  ... and ${pathsInLayer.length - 10} more`);
  }
  console.log(`\nUpdate bones.json to include "${targetGroup}" if needed.`);
  console.log(`Then apply the changes.\n`);

  console.log('═══════════════════════════════════════════════════════════════\n');

  // If --apply flag is set, actually do it
  if (process.argv[4] === '--apply') {
    console.log('⚠️  APPLYING CHANGES...\n');

    // Create backup
    const backupPath = svgPath + '.backup';
    fs.copyFileSync(svgPath, backupPath);
    console.log(`✓ Backup saved: ${backupPath}\n`);

    // Perform replacement
    let modified = svgContent.replace(
      `<g id="${layerToFix}">`,
      `<g id="${targetGroup}">`,
    );

    fs.writeFileSync(svgPath, modified);
    console.log(`✓ Modified ${layerToFix} → ${targetGroup}`);
    console.log(`✓ File saved: ${svgPath}\n`);
    console.log('🔄 Next steps:');
    console.log('  1. Reload the browser (F5)');
    console.log('  2. Test hovering over the affected bone\n');
  }
}
