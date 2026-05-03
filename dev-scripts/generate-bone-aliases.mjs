import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const bonesPath = join(__dirname, '../prisma/data/bones.json');

// Helper function to generate aliases from a bone name
function generateAliasesForBone(bone) {
  if (bone.aliases && bone.aliases.length > 0) {
    return bone.aliases; // Already has aliases
  }

  const aliases = [];
  const name = bone.name.toLowerCase();
  const latinName = bone.latinName?.toLowerCase() || '';

  // Strategy: Extract key terms and create variations
  const parts = name.split(/[\s()]+/).filter(p => p.length > 0);

  // Add common anatomical variations
  if (name.includes('left')) {
    aliases.push(...parts.filter(p => p !== 'left').map(p => p + ' left'));
    aliases.push('left ' + parts.filter(p => p !== 'left').join(' '));
  }

  if (name.includes('right')) {
    aliases.push(...parts.filter(p => p !== 'right').map(p => p + ' right'));
    aliases.push('right ' + parts.filter(p => p !== 'right').join(' '));
  }

  // Add common names based on pattern matching
  if (name.includes('foot')) {
    aliases.push('feet');
    if (name.includes('left')) aliases.push('left foot');
    if (name.includes('right')) aliases.push('right foot');
  }

  if (name.includes('hand')) {
    aliases.push('hands');
    if (name.includes('left')) aliases.push('left hand');
    if (name.includes('right')) aliases.push('right hand');
  }

  if (name.includes('tarsal')) {
    aliases.push('ankle bones');
    if (name.includes('left')) aliases.push('left ankle');
    if (name.includes('right')) aliases.push('right ankle');
  }

  if (name.includes('metatarsal')) {
    aliases.push('midfoot');
    aliases.push('sole bones');
  }

  if (name.includes('phalanges') && name.includes('foot')) {
    aliases.push('toe bones');
    aliases.push('toes');
  }

  if (name.includes('phalanges') && name.includes('hand')) {
    aliases.push('finger bones');
    aliases.push('fingers');
  }

  if (name.includes('carpals') || name.includes('carpal')) {
    aliases.push('wrist bones');
    aliases.push('wrist');
  }

  if (name.includes('metacarpals') || name.includes('metacarpal')) {
    aliases.push('palm bones');
    aliases.push('palm');
  }

  if (name.includes('vertebrae')) {
    aliases.push('spinal bones');
    aliases.push('vertebra');
  }

  if (name.includes('ribcage') || name.includes('ribs')) {
    aliases.push('ribs');
    aliases.push('thoracic cage');
  }

  if (name.includes('sacrum')) {
    aliases.push('base of spine');
    aliases.push('sacred bone');
  }

  if (name.includes('coccyx')) {
    aliases.push('tailbone');
    aliases.push('caudal vertebra');
  }

  if (name.includes('sternum')) {
    aliases.push('breastbone');
    aliases.push('chest bone');
  }

  if (name.includes('manubrium')) {
    aliases.push('upper sternum');
    aliases.push('sternal handle');
  }

  // Add latin name if different from English name
  if (latinName && latinName !== name && latinName.length > 2) {
    aliases.push(bone.latinName);
  }

  // Remove duplicates and empty strings
  const uniqueAliases = [...new Set(aliases.filter(a => a && a.length > 0))];

  return uniqueAliases;
}

async function main() {
  console.log('🦴 Generating missing bone aliases...\n');

  const bonesData = JSON.parse(fs.readFileSync(bonesPath, 'utf-8'));

  let updated = 0;
  const report = [];

  for (const bone of bonesData) {
    const hadAliases = bone.aliases && bone.aliases.length > 0;

    if (!hadAliases) {
      const newAliases = generateAliasesForBone(bone);
      bone.aliases = newAliases;
      updated++;

      report.push(`✓ ${bone.name}`);
      report.push(`  Aliases: ${newAliases.join(', ')}`);
    }
  }

  // Write back to file with proper formatting
  fs.writeFileSync(bonesPath, JSON.stringify(bonesData, null, 2) + '\n', 'utf-8');

  console.log(`✅ Updated ${updated} bones with generated aliases\n`);
  console.log(report.join('\n'));
  console.log(`\n📁 File saved: ${bonesPath}`);
}

main().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
