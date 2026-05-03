#!/usr/bin/env node

/**
 * GAP #1 AUDIT: Compare SVG IDs against bones.json
 * 
 * Produces comprehensive report:
 * - Bones in DB with svgPathIds that DON'T exist in SVG
 * - SVG IDs that exist but NO bone references them
 * - Coverage percentage
 * - Recommendations
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Actual SVG IDs from bone-ids.txt (first 15 lines)
const ACTUAL_SVG_IDS = new Set([
  // Feet
  'foot-left', 'tarsals-left', 'metatarsals-left', 'phalanges-left',
  'foot-right', 'tarsals-right', 'metatarsals-right', 'phalanges-right',
  // Legs
  'femur-right', 'femur-left', 'fibula-left', 'fibula-right', 'tibia', 'tibia-left', 'tibia-right',
  // Knees & Pelvis
  'patella-left', 'patella-right', 'pelvis', 'sacrum', 'coccyx', 'lumbar-vertebrae', 'ribcage',
  // Vertebrae & Ribs
  'thoracic-vertebrae', 'cervical-vertebrae', 'knee-joint-left', 'knee-joint-right',
  // Sternum
  'hip-joint', 'hip-joint-right', 'sternum', 'manubrium',
  // Skull
  'skull', 'mandible', 'teeth', 'cranium',
  // Shoulders & Arms
  'scapula', 'scapular-left', 'scapula-right', 'clavicle-left', 'clavicle-right',
  'humerus-left', 'humerus-right', 'radius-left', 'radius-right',
  'ulna-left', 'ulna-right',
  // Hands
  'hand-left', 'hand-right', 'carpals-left', 'carpals-right',
  'metacarpals-left', 'metacarpals-right', 'phalanges-left', 'phalanges-right',
]);

interface Bone {
  name: string;
  svgPathIds?: { [key: string]: string[] };
  metadata?: { svgPathId?: string };
}

interface AuditResult {
  bonesWithMissingSvg: Array<{ name: string; svgIds: string[]; status: string }>;
  unusedSvgIds: string[];
  totalBones: number;
  bonesWithValidSvg: number;
  coverage: number;
  recommendations: string[];
}

function readBonesJson(): Bone[] {
  const filePath = path.join(__dirname, '../prisma/data/bones.json');
  const content = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(content);
}

function extractSvgPathIds(bone: Bone): string[] {
  const ids: string[] = [];
  
  // Check svgPathIds object (new format)
  if (bone.svgPathIds && typeof bone.svgPathIds === 'object') {
    Object.values(bone.svgPathIds).forEach((systemIds) => {
      if (Array.isArray(systemIds)) {
        ids.push(...systemIds);
      }
    });
  }
  
  // Check metadata.svgPathId (legacy format)
  if (bone.metadata?.svgPathId && typeof bone.metadata.svgPathId === 'string') {
    ids.push(bone.metadata.svgPathId);
  }
  
  return ids;
}

function normalizeId(id: string): string {
  // Convert CamelCase to kebab-case for comparison
  return id
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .toLowerCase();
}

function runAudit(): AuditResult {
  console.log('🔍 GAP #1: SVG ↔ DATABASE AUDIT\n');
  
  const bones = readBonesJson();
  const referencedSvgIds = new Set<string>();
  const bonesWithMissingSvg: Array<{ name: string; svgIds: string[]; status: string }> = [];
  
  console.log(`📊 Analyzing ${bones.length} bones...\n`);
  
  // Check each bone
  for (const bone of bones) {
    const svgIds = extractSvgPathIds(bone);
    
    for (const svgId of svgIds) {
      const normalizedId = normalizeId(svgId);
      
      if (ACTUAL_SVG_IDS.has(normalizedId)) {
        referencedSvgIds.add(normalizedId);
      } else {
        // This SVG ID is NOT in the actual SVG
        bonesWithMissingSvg.push({
          name: bone.name,
          svgIds: [normalizedId],
          status: '❌ MISSING from SVG',
        });
        console.log(`  ❌ ${bone.name}: "${normalizedId}" NOT FOUND in SVG`);
      }
    }
  }
  
  // Find unused SVG IDs
  const unusedSvgIds = Array.from(ACTUAL_SVG_IDS).filter(
    (id) => !referencedSvgIds.has(id)
  );
  
  const bonesWithValidSvg = bones.length - bonesWithMissingSvg.length;
  const coverage = (bonesWithValidSvg / bones.length) * 100;
  
  const recommendations: string[] = [];
  
  if (bonesWithMissingSvg.length > 0) {
    recommendations.push(
      `⚠️  ${bonesWithMissingSvg.length} bones reference SVG IDs that don't exist`
    );
    recommendations.push('   ACTION: Either (1) Create missing SVG groups, or (2) Update bones.json');
  }
  
  if (unusedSvgIds.length > 0) {
    recommendations.push(
      `⚠️  ${unusedSvgIds.length} SVG IDs exist but NO bone references them`
    );
    recommendations.push('   ACTION: Either (1) Add missing bones to DB, or (2) Remove orphaned SVG groups');
  }
  
  if (coverage === 100 && unusedSvgIds.length === 0) {
    recommendations.push('✅ PERFECT ALIGNMENT: All bones have valid SVG IDs, no orphans');
  }
  
  return {
    bonesWithMissingSvg,
    unusedSvgIds,
    totalBones: bones.length,
    bonesWithValidSvg,
    coverage,
    recommendations,
  };
}

function printReport(result: AuditResult): void {
  console.log('\n' + '='.repeat(70));
  console.log('AUDIT REPORT');
  console.log('='.repeat(70) + '\n');
  
  console.log(`📋 SUMMARY:`);
  console.log(`   Total bones in DB: ${result.totalBones}`);
  console.log(`   Bones with valid SVG: ${result.bonesWithValidSvg}`);
  console.log(`   Coverage: ${result.coverage.toFixed(1)}%`);
  console.log(`   Unused SVG IDs: ${result.unusedSvgIds.length}\n`);
  
  if (result.bonesWithMissingSvg.length > 0) {
    console.log(`❌ MISSING SVG IDS (${result.bonesWithMissingSvg.length}):`);
    for (const item of result.bonesWithMissingSvg) {
      console.log(`   • ${item.name}: ${item.svgIds.join(', ')}`);
    }
    console.log();
  }
  
  if (result.unusedSvgIds.length > 0) {
    console.log(`📍 UNUSED SVG IDS (${result.unusedSvgIds.length}):`);
    for (const id of result.unusedSvgIds.slice(0, 20)) {
      console.log(`   • ${id}`);
    }
    if (result.unusedSvgIds.length > 20) {
      console.log(`   ... and ${result.unusedSvgIds.length - 20} more`);
    }
    console.log();
  }
  
  console.log(`💡 RECOMMENDATIONS:`);
  for (const rec of result.recommendations) {
    console.log(`   ${rec}`);
  }
  console.log('\n' + '='.repeat(70) + '\n');
  
  // Write JSON report
  const reportPath = path.join(__dirname, '../instructions/gap-1-audit-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(result, null, 2));
  console.log(`✅ Full report saved to: instructions/gap-1-audit-report.json`);
}

// Run audit
const result = runAudit();
printReport(result);

// Exit with error if issues found
if (result.bonesWithMissingSvg.length > 0 || result.unusedSvgIds.length > 0) {
  process.exit(1);
}
