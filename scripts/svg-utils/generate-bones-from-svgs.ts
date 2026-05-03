import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface SvgPathReference {
  [system: string]: Record<string, { viewBox?: string; boundingBox?: any }> | string;
}

interface BoneEntry {
  name: string;
  latinName: string;
  aliases: string[];
  system: "SKELETAL" | "MUSCULAR" | "VASCULAR" | "NERVOUS" | "ENDOCRINE";
  category: string;
  svgPathIds: Record<string, string[]>;
  description: string;
  metadata: Record<string, unknown>;
}

// Convert camelCase/PascalCase SVG IDs to readable names
function svgIdToName(id: string): string {
  // Insert space before capital letters: FemurLeft -> Femur Left
  return id
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/([A-Z])([A-Z][a-z])/g, "$1 $2");
}

async function generateBonesFromSvgs() {
  console.log("🔍 Reading SVG paths reference...\n");

  const refPath = path.join(
    __dirname,
    "..",
    "..",
    "prisma",
    "data",
    "svg-paths-reference.json"
  );

  const anatomicalPath = path.join(
    __dirname,
    "..",
    "..",
    "prisma",
    "data",
    "anatomical-reference.json"
  );

  if (!fs.existsSync(refPath)) {
    console.error(
      "❌ svg-paths-reference.json not found. Run `npm run extract-svg-paths` first."
    );
    process.exit(1);
  }

  if (!fs.existsSync(anatomicalPath)) {
    console.error(
      "❌ anatomical-reference.json not found. Create it first."
    );
    process.exit(1);
  }

  const svgReference: SvgPathReference = JSON.parse(
    fs.readFileSync(refPath, "utf-8")
  );

  const anatomicalReference: Record<string, any> = JSON.parse(
    fs.readFileSync(anatomicalPath, "utf-8")
  );

  const bones: BoneEntry[] = [];
  const processedIds = new Set<string>();
  const systemMap: Record<string, "SKELETAL" | "MUSCULAR" | "VASCULAR" | "NERVOUS" | "ENDOCRINE"> = {
    SKELETAL: "SKELETAL",
    MUSCULAR: "MUSCULAR",
    VASCULAR: "VASCULAR",
    NERVOUS: "NERVOUS",
    ENDOCRINE: "ENDOCRINE",
  };

  // PASS 1: Process bones WITH SVG paths
  console.log("📊 PASS 1: Processing bones with SVG paths...\n");
  
  for (const [system, paths] of Object.entries(svgReference)) {
    if (system === "_version" || typeof paths === "string") continue;

    console.log(`📂 Processing ${system}...`);
    const pathIds = Object.keys(paths);

    for (const pathId of pathIds) {
      // Try to find matching anatomical reference by SVG ID
      let enrichedData = anatomicalReference[pathId];
      
      // If not found by exact ID, try to find by name conversion
      if (!enrichedData) {
        const convertedName = svgIdToName(pathId);
        enrichedData = anatomicalReference[convertedName];
      }

      // Use enriched data if available, otherwise create placeholder
      const bone: BoneEntry = enrichedData
        ? {
            name: enrichedData.name,
            latinName: enrichedData.latinName,
            aliases: enrichedData.aliases || [],
            system: enrichedData.system || systemMap[system] || "SKELETAL",
            category: "BONE",
            svgPathIds: {
              [system]: [pathId],
            },
            description: enrichedData.description,
            metadata: enrichedData.metadata || {},
          }
        : {
            name: svgIdToName(pathId),
            latinName: svgIdToName(pathId),
            aliases: [],
            system: systemMap[system] || "SKELETAL",
            category: "BONE",
            svgPathIds: {
              [system]: [pathId],
            },
            description: `${svgIdToName(pathId)} from the ${system.toLowerCase()} system.`,
            metadata: {
              source: "auto-generated from SVG",
              extractedFrom: system,
            },
          };

      bones.push(bone);
      processedIds.add(pathId);
    }

    console.log(`  ✓ Added ${pathIds.length} structures from ${system}`);
  }

  // PASS 2: Process bones WITHOUT SVG paths (database only)
  console.log("\n📊 PASS 2: Processing bones without SVG paths (database-only)...\n");
  
  let dbOnlyCount = 0;
  for (const [refId, refData] of Object.entries(anatomicalReference)) {
    if (!processedIds.has(refId)) {
      const bone: BoneEntry = {
        name: refData.name,
        latinName: refData.latinName,
        aliases: refData.aliases || [],
        system: refData.system || "SKELETAL",
        category: "BONE",
        svgPathIds: {}, // Empty for non-interactive bones
        description: refData.description,
        metadata: {
          ...refData.metadata,
          source: "anatomical reference (database only)",
        },
      };

      bones.push(bone);
      dbOnlyCount++;
    }
  }
  
  console.log(`  ✓ Added ${dbOnlyCount} database-only structures\n`);

  // Save to bones.json
  const outputPath = path.join(__dirname, "..", "..", "prisma", "data", "bones.json");
  fs.writeFileSync(outputPath, JSON.stringify(bones, null, 2));

  console.log(`✅ Generated ${bones.length} bone entries total`);
  console.log(`   - ${bones.length - dbOnlyCount} with SVG paths (interactive)`);
  console.log(`   - ${dbOnlyCount} database-only (RAG searchable)`);
  console.log(`📋 Saved to ${outputPath}`);
}

generateBonesFromSvgs().catch(console.error);