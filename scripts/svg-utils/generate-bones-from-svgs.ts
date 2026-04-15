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

  if (!fs.existsSync(refPath)) {
    console.error(
      "❌ svg-paths-reference.json not found. Run `npm run extract-svg-paths` first."
    );
    process.exit(1);
  }

  const svgReference: SvgPathReference = JSON.parse(
    fs.readFileSync(refPath, "utf-8")
  );

  const bones: BoneEntry[] = [];
  const systemMap: Record<string, "SKELETAL" | "MUSCULAR" | "VASCULAR" | "NERVOUS" | "ENDOCRINE"> = {
    SKELETAL: "SKELETAL",
    MUSCULAR: "MUSCULAR",
    VASCULAR: "VASCULAR",
    NERVOUS: "NERVOUS",
    ENDOCRINE: "ENDOCRINE",
  };

  // Iterate through each system
  for (const [system, paths] of Object.entries(svgReference)) {
    if (system === "_version" || typeof paths === "string") continue;

    console.log(`📂 Processing ${system}...`);
    const pathIds = Object.keys(paths);

    for (const pathId of pathIds) {
      const name = svgIdToName(pathId);

      const bone: BoneEntry = {
        name,
        latinName: name, // Placeholder - you may want to add a lookup table
        aliases: [],
        system: systemMap[system] || "SKELETAL",
        category: "BONE",
        svgPathIds: {
          [system]: [pathId],
        },
        description: `${name} from the ${system.toLowerCase()} system.`,
        metadata: {
          source: "auto-generated from SVG",
          extractedFrom: system,
        },
      };

      bones.push(bone);
    }

    console.log(`  ✓ Added ${pathIds.length} structures from ${system}`);
  }

  // Save to bones.json
  const outputPath = path.join(__dirname, "..", "..", "prisma", "data", "bones.json");
  fs.writeFileSync(outputPath, JSON.stringify(bones, null, 2));

  console.log(`\n✅ Generated ${bones.length} bone entries`);
  console.log(`📋 Saved to ${outputPath}`);
}

generateBonesFromSvgs().catch(console.error);