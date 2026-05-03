import fs from 'fs';

const dataStr = fs.readFileSync('./tests/evals/benchmark-dataset.json', 'utf8');
const data = JSON.parse(dataStr);

const validIds = [
  'foot-left', 'tarsals-left', 'metatarsals-left', 'phalanges-left', 'foot-right', 'tarsals-right', 'metatarsals-right', 'phalanges-right',
  'femur-right', 'femur-left', 'fibula-left', 'fibula-right', 'tibia', 'tibia-left', 'tibia-right', 'patella-left', 'patella-right',
  'pelvis', 'pelvic-girdle', 'sacrum', 'coccyx', 'lumbar-vertebrae', 'ribcage', 'thoracic-vertebrae', 'cervical-vertebrae',
  'knee-joint-left', 'knee-joint-right', 'hip-joint-left', 'hip-joint-right', 'sternum', 'manubrium', 'skull', 'mandible', 'teeth', 'cranium',
  'scapula', 'scapular-left', 'scapula-right', 'clavicle-left', 'clavicle-right', 'humerus-left', 'humerus-right', 'radius-left', 'radius-right', 'ulna-left', 'ulna-right',
  'hand-left', 'hand-right', 'carpals-left', 'carpals-right', 'metacarpals-left', 'metacarpals-right', 'phalanges-left', 'phalanges-right', 'phalanges-f-left', 'phalanges-f-right'
];

const issues = [];
data.forEach((item, idx) => {
  if (item.expectedStructures && item.expectedStructures.length > 0) {
    item.expectedStructures.forEach(id => {
      if (!validIds.includes(id)) {
        issues.push({ line: idx, id: item.id, invalidId: id });
      }
    });
  }
});

console.log('=== SVG ID VALIDATION ===');
if (issues.length > 0) {
  console.log('\nINVALID SVG IDs FOUND:');
  issues.forEach(i => console.log(`  ${i.id}: "${i.invalidId}"`));
} else {
  console.log('\n✓ All expectedStructures contain ONLY valid SVG IDs');
}
console.log(`\nTotal queries: ${data.length}`);
console.log(`Queries with issues: ${new Set(issues.map(i => i.id)).size}`);
