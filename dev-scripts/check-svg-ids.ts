import { db } from "../src/lib/db";
import { EXISTING_BONES_SVG } from "../src/lib/bone-constants";
import { ValidSvgId } from "../tests/evals/types";

/**
 * Quick script to check if all structures have valid SVG IDs
 * and if all SVG IDs from bone-constants exist in the database
 */

async function checkSvgIds() {
  console.log("📊 Checking SVG ID mapping in database...\n");

  try {
    // Get all structures from database
    const structures = await db.structure.findMany({
      select: {
        name: true,
        svgPathIds: true,
        category: true,
      },
      orderBy: { name: "asc" },
    });

    console.log(`Total structures in DB: ${structures.length}`);
    console.log(
      `Valid SVG IDs in bone-constants: ${EXISTING_BONES_SVG.length}\n`,
    );

    // Collect all SVG IDs actually used in DB
    const usedIds = new Set<string>();
    structures.forEach((s) => {
      (s.svgPathIds || []).forEach((id) => usedIds.add(id));
    });

    console.log(`Unique SVG IDs used in DB: ${usedIds.size}`);
    console.log(`Used IDs: ${Array.from(usedIds).sort().join(", ")}\n`);

    // Check for missing IDs (in bone-constants but not in DB)
    const missingFromDb = EXISTING_BONES_SVG.filter((id) => !usedIds.has(id));
    if (missingFromDb.length > 0) {
      console.log(
        "⚠️  SVG IDs in bone-constants but NOT used in any structure:",
      );
      console.log(`  ${missingFromDb.join(", ")}\n`);
    }

    // Check for extra IDs (in DB but not in bone-constants)
    const extraInDb = Array.from(usedIds).filter(
      (id) => !EXISTING_BONES_SVG.includes(id as ValidSvgId),
    );
    if (extraInDb.length > 0) {
      console.log("⚠️  SVG IDs in database but NOT in bone-constants:");
      console.log(`  ${extraInDb.join(", ")}\n`);
    }

    // Show structures grouped by category
    console.log("📋 Structures by category:\n");
    const byCategory: Record<string, any[]> = {};
    structures.forEach((s) => {
      if (!byCategory[s.category]) byCategory[s.category] = [];
      byCategory[s.category].push(s);
    });

    Object.entries(byCategory).forEach(([cat, items]) => {
      console.log(`${cat}: ${items.length} structures`);
      items.slice(0, 5).forEach((item) => {
        console.log(
          `  - ${item.name}: [${(item.svgPathIds || []).join(", ")}]`,
        );
      });
      if (items.length > 5) console.log(`  ... and ${items.length - 5} more`);
      console.log();
    });

    if (missingFromDb.length === 0 && extraInDb.length === 0) {
      console.log("✅ Perfect match! All SVG IDs are in sync.");
    }
  } catch (error) {
    console.error("Error checking SVG IDs:", error);
  }
}

checkSvgIds();
