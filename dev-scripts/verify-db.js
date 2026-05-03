import { db } from '../src/lib/db';
/**
 * Database Verification Script
 *
 * Verifies that the database contains all expected bone data with correct information:
 * - All structures have required fields
 * - Descriptions match the source data
 * - SVG path IDs are correct
 * - Embeddings are present
 * - Metadata contains svgPathId
 *
 * Usage: npm run verify:db
 */
// Reference data from fetch-anatomical-data.ts
const EXPECTED_STRUCTURES = {
    Frontal: {
        name: 'Frontal Bone',
        latinName: 'Os frontale',
        description: 'Forms the anterior and superior part of the cranium. Contains the frontal sinuses and has a prominent brow ridge.',
        svgPathId: 'Cranium',
    },
    Parietal: {
        name: 'Parietal Bone',
        latinName: 'Os parietale',
        description: 'Forms the sides and roof of the cranium. Two bones (left and right) that meet at the sagittal suture.',
        svgPathId: 'Cranium',
    },
    Temporal: {
        name: 'Temporal Bone',
        latinName: 'Os temporale',
        description: 'Forms the sides and base of the cranium. Contains the ear canal and articulates with the mandible.',
        svgPathId: 'Cranium',
    },
    Occipital: {
        name: 'Occipital Bone',
        latinName: 'Os occipitale',
        description: 'Forms the posterior and inferior part of the cranium. Contains the foramen magnum through which the spinal cord passes.',
        svgPathId: 'Cranium',
    },
    Ethmoid: {
        name: 'Ethmoid Bone',
        latinName: 'Os ethmoideum',
        description: 'Forms part of the cranial floor and nasal septum. Contains ethmoidal air cells and contributes to the nasal cavity.',
        svgPathId: 'Cranium',
    },
    Sphenoid: {
        name: 'Sphenoid Bone',
        latinName: 'Os sphenoidale',
        description: 'Located at the base of the cranium, forms the sella turcica which houses the pituitary gland. Has multiple foramina for nerves and vessels.',
        svgPathId: 'Cranium',
    },
    Nasal: {
        name: 'Nasal Bone',
        latinName: 'Os nasale',
        description: 'Forms the bridge of the nose. Two small rectangular bones.',
        svgPathId: 'Cranium',
    },
    Lacrimal: {
        name: 'Lacrimal Bone',
        latinName: 'Os lacrimale',
        description: 'Small bone forming part of the medial wall of the orbit. Contains the lacrimal groove for tear ducts.',
        svgPathId: 'Cranium',
    },
    Zygomatic: {
        name: 'Zygomatic Bone',
        latinName: 'Os zygomaticum',
        description: 'Forms the prominence of the cheek. Articulates with the frontal, temporal, and maxilla.',
        svgPathId: 'Cranium',
    },
    Maxilla: {
        name: 'Maxilla',
        latinName: 'Maxilla',
        description: 'Forms the upper jaw and palate. Holds the upper teeth and has large sinuses (maxillary sinuses).',
        svgPathId: 'Cranium',
    },
    Vomer: {
        name: 'Vomer',
        latinName: 'Vomer',
        description: 'Unpaired bone that forms the inferior and posterior part of the nasal septum.',
        svgPathId: 'Cranium',
    },
    Mandible: {
        name: 'Mandible',
        latinName: 'Mandibula',
        description: 'Forms the lower jaw. Articulates with both temporal bones at the temporomandibular joint.',
        svgPathId: 'Cranium',
    },
    Palatine: {
        name: 'Palatine Bone',
        latinName: 'Os palatinum',
        description: 'Forms the posterior part of the hard palate and contributes to the nasal cavity.',
        svgPathId: 'Cranium',
    },
    'Inferior Nasal Concha': {
        name: 'Inferior Nasal Concha',
        latinName: 'Concha nasalis inferior',
        description: 'Bony ridge in the nasal cavity that projects from the lateral wall. Extends from the maxilla.',
        svgPathId: 'Cranium',
    },
    // Vertebrae samples
    Vertebra_C1: {
        name: 'Atlas (C1)',
        latinName: 'Vertebra cervicalis I',
        description: 'Supports the skull. Lacks a body; consists of anterior and posterior arches with lateral masses.',
        svgPathId: 'CervicalVertebrae',
    },
    Vertebra_L5: {
        name: 'Lumbar Vertebra (L5)',
        latinName: 'Vertebra lumbalis V',
        description: 'Fifth lumbar vertebra. Articulates with the sacrum below.',
        svgPathId: 'LumbarVertebrae',
    },
    Sacrum: {
        name: 'Sacrum',
        latinName: 'Os sacrum',
        description: 'Large triangular bone formed by fusion of 5 sacral vertebrae. Base of the spine, articulates with pelvis.',
        svgPathId: 'Sacrum',
    },
    Coccyx: {
        name: 'Coccyx',
        latinName: 'Os coccygis',
        description: 'Small triangular bone formed by fusion of 3-5 coccygeal vertebrae at the base of spine.',
        svgPathId: 'Coccyx',
    },
    Sternum: {
        name: 'Sternum',
        latinName: 'Sternum',
        description: 'Flat bone in center of chest connecting ribs and clavicles. Protects heart and lungs.',
        svgPathId: 'Sternum',
    },
    Manubrium: {
        name: 'Manubrium',
        latinName: 'Manubrium sterni',
        description: 'Upper portion of the sternum. Articulates with the clavicles and first ribs.',
        svgPathId: 'Manubrium',
    },
};
async function verifyDatabase() {
    console.log('\n📋 Database Verification Report\n');
    console.log('='.repeat(70));
    let totalChecks = 0;
    let passedChecks = 0;
    let failedChecks = 0;
    const issues = [];
    try {
        // 1. Check total structure count
        const totalStructures = await db.structure.count();
        console.log(`\n✅ Total Structures: ${totalStructures}`);
        totalChecks++;
        passedChecks++;
        // 2. Fetch all structures for detailed verification
        const structures = (await db.structure.findMany({
            select: {
                id: true,
                name: true,
                latinName: true,
                description: true,
                svgPathIds: true,
                metadata: true,
            },
        }));
        // 3. Check required fields
        console.log('\n📊 Field Presence Checks:');
        let missingDescriptions = 0;
        let missingSvgPathIds = 0;
        let missingSvgPathIdInMetadata = 0;
        for (const struct of structures) {
            totalChecks++;
            if (!struct.description || struct.description.trim() === '') {
                missingDescriptions++;
                issues.push(`  ❌ ${struct.name}: Missing description`);
            }
            else {
                passedChecks++;
            }
            totalChecks++;
            if (!struct.svgPathIds || struct.svgPathIds.length === 0) {
                missingSvgPathIds++;
                issues.push(`  ❌ ${struct.name}: Missing svgPathIds`);
            }
            else {
                passedChecks++;
            }
            totalChecks++;
            const hasSvgPathIdInMetadata = struct.metadata && struct.metadata.svgPathId;
            if (!hasSvgPathIdInMetadata) {
                missingSvgPathIdInMetadata++;
                issues.push(`  ⚠️  ${struct.name}: Missing svgPathId in metadata`);
            }
            else {
                passedChecks++;
            }
        }
        console.log(`  ✅ Descriptions: ${structures.length - missingDescriptions}/${structures.length}`);
        if (missingDescriptions > 0) {
            console.log(`  ❌ Missing descriptions: ${missingDescriptions}`);
            failedChecks++;
        }
        console.log(`  ✅ SVG Path IDs: ${structures.length - missingSvgPathIds}/${structures.length}`);
        if (missingSvgPathIds > 0) {
            console.log(`  ❌ Missing svgPathIds: ${missingSvgPathIds}`);
            failedChecks++;
        }
        console.log(`  ✅ Metadata svgPathId: ${structures.length - missingSvgPathIdInMetadata}/${structures.length}`);
        if (missingSvgPathIdInMetadata > 0) {
            console.log(`  ⚠️  Missing metadata.svgPathId: ${missingSvgPathIdInMetadata}`);
        }
        // Check embeddings with raw query
        const embeddingsResult = (await db.$queryRaw `SELECT COUNT(*) as count FROM structures WHERE embedding IS NOT NULL`);
        const embeddingCount = Number(embeddingsResult[0].count);
        console.log(`  ✅ Embeddings: ${embeddingCount}/${structures.length}`);
        totalChecks++;
        if (embeddingCount === structures.length) {
            passedChecks++;
        }
        else {
            console.log(`  ❌ Missing embeddings: ${structures.length - embeddingCount}`);
            failedChecks++;
        }
        // 4. Verify descriptions match source data
        console.log('\n📝 Description Match Verification:');
        let matchedDescriptions = 0;
        let mismatchedDescriptions = 0;
        for (const [, expected] of Object.entries(EXPECTED_STRUCTURES)) {
            totalChecks++;
            const dbStruct = structures.find((s) => s.name === expected.name);
            if (!dbStruct) {
                console.log(`  ⚠️  ${expected.name}: Not found in database`);
                continue;
            }
            if (dbStruct.description === expected.description) {
                matchedDescriptions++;
                passedChecks++;
            }
            else {
                mismatchedDescriptions++;
                failedChecks++;
                console.log(`  ❌ ${expected.name}: Description mismatch`);
                console.log(`     Expected: "${expected.description.substring(0, 60)}..."`);
                console.log(`     Got:      "${dbStruct.description.substring(0, 60)}..."`);
                issues.push(`  ❌ ${expected.name}: Description does not match source data`);
            }
        }
        console.log(`  ✅ Matched: ${matchedDescriptions}/${Object.keys(EXPECTED_STRUCTURES).length}`);
        if (mismatchedDescriptions > 0) {
            console.log(`  ❌ Mismatched: ${mismatchedDescriptions}`);
        }
        // 5. Verify SVG path IDs are valid
        console.log('\n🎨 SVG Path ID Verification:');
        const validSvgIds = new Set([
            'Cranium',
            'CervicalVertebrae',
            'ThoracicVertebrae',
            'LumbarVertebrae',
            'Sacrum',
            'Coccyx',
            'Sternum',
            'Manubrium',
            'PelvicGirdle',
            'ClavicleLeft',
            'ClavicleRight',
            'ScapulaLeft',
            'ScapulaRight',
            'HumerusLeft',
            'HumerusRight',
            'RadiusLeft',
            'RadiusRight',
            'UlnaLeft',
            'UlnaRight',
            'CarpalsLeft',
            'CarpalsRight',
            'MetacarpalsLeft',
            'MetacarpalsRight',
            'PhalangesLeft',
            'PhalangesRight',
            'HandLeft',
            'HandRight',
            'FemurLeft',
            'FemurRight',
            'PatellaLeft',
            'PatellaRight',
            'TibiaLeft',
            'TibiaRight',
            'FibulaLeft',
            'FibulaRight',
            'TarsalsLeft',
            'TarsalsRight',
            'MetatarsalsLeft',
            'MetatarsalsRight',
            'PhalangesFootLeft',
            'PhalangesFootRight',
            'FootLeft',
            'FootRight',
            'Skull',
        ]);
        let invalidSvgIds = 0;
        for (const struct of structures) {
            for (const svgId of struct.svgPathIds || []) {
                totalChecks++;
                if (validSvgIds.has(svgId)) {
                    passedChecks++;
                }
                else {
                    invalidSvgIds++;
                    failedChecks++;
                    issues.push(`  ❌ ${struct.name}: Invalid SVG path ID "${svgId}"`);
                }
            }
        }
        console.log(`  ✅ Valid SVG IDs: ${structures.length - invalidSvgIds}/${structures.length}`);
        if (invalidSvgIds > 0) {
            console.log(`  ❌ Invalid SVG IDs: ${invalidSvgIds}`);
        }
        // 6. Sample data inspection
        console.log('\n🔍 Sample Data Inspection:');
        const samples = structures.slice(0, 3);
        for (const struct of samples) {
            console.log(`\n  📌 ${struct.name}`);
            console.log(`     Latin Name: ${struct.latinName}`);
            console.log(`     Description: "${struct.description.substring(0, 50)}..."`);
            console.log(`     SVG Path IDs: ${struct.svgPathIds?.join(', ') || 'N/A'}`);
            console.log(`     Metadata.svgPathId: ${struct.metadata?.svgPathId || '❌ Missing'}`);
        }
        // Summary
        console.log('\n' + '='.repeat(70));
        console.log('\n📊 Verification Summary:');
        console.log(`   Total Checks: ${totalChecks}`);
        console.log(`   ✅ Passed: ${passedChecks}`);
        console.log(`   ❌ Failed: ${failedChecks}`);
        const passPercentage = ((passedChecks / totalChecks) * 100).toFixed(1);
        console.log(`   📈 Pass Rate: ${passPercentage}%`);
        if (issues.length > 0) {
            console.log('\n⚠️  Issues Found:');
            issues.slice(0, 10).forEach((issue) => console.log(issue));
            if (issues.length > 10) {
                console.log(`   ... and ${issues.length - 10} more issues`);
            }
        }
        else {
            console.log('\n✅ All verifications passed!');
        }
        console.log('\n' + '='.repeat(70) + '\n');
        // Exit with appropriate code
        process.exit(failedChecks === 0 ? 0 : 1);
    }
    catch (error) {
        console.error('\n❌ Verification failed with error:', error);
        process.exit(1);
    }
}
verifyDatabase();
//# sourceMappingURL=verify-db.js.map