import { fileURLToPath } from "url";
import { dirname } from "path";
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
import * as fs from "fs";
import * as path from "path";
import { JSDOM } from "jsdom";
import * as crypto from "crypto";

interface SvgIndexData {
  viewBox?: string;
  boundingBox?: { x: number; y: number; width: number; height: number };
}

interface SvgIndex {
  _version: string;
  [system: string]: Record<string, SvgIndexData> | string;
}

const SYSTEM_SVG_MAP: Record<string, string> = {
  SKELETAL: "frontend/public/svgs/skeleton.svg",
  MUSCULAR: "frontend/public/svgs/muscles.svg",
  VASCULAR: "frontend/public/svgs/vascular.svg",
  NERVOUS: "frontend/public/svgs/nervous.svg",
  ENDOCRINE: "frontend/public/svgs/endocrine.svg",
};

async function extractSvgPaths(): Promise<Omit<SvgIndex, "_version">> {
  const index: Omit<SvgIndex, "_version"> = {};

  for (const [system, svgPath] of Object.entries(SYSTEM_SVG_MAP)) {
    const fullPath = path.join(__dirname, "..", svgPath);

    // Skip if SVG doesn't exist yet
    if (!fs.existsSync(fullPath)) {
      console.warn(
        `⚠️  ${svgPath} not found (system: ${system}), skipping`
      );
      continue;
    }

    console.log(`\n📂 Parsing ${system} SVG...`);

    const svgContent = fs.readFileSync(fullPath, "utf-8");
    const dom = new JSDOM(svgContent);
    const { document } = dom.window;

    // Extract viewBox from root SVG
    const svg = document.querySelector("svg") as any;
    const rootViewBox = svg?.getAttribute("viewBox") || undefined;

    const systemIndex: Record<string, SvgIndexData> = {};

    // Extract all paths with IDs and groups with IDs
    const elements = document.querySelectorAll("[id]");

    elements.forEach((elem: any) => {
      const id = elem.getAttribute("id");

      // Skip Inkscape/Adobe internal IDs (layer names, metadata, etc.)
      if (
        !id ||
        id.startsWith("metadata") ||
        id.startsWith("defs") ||
        id.includes("Layer") ||
        id.match(/^(rect|g|path)\d+$/)
      ) {
        return;
      }

      // Extract bounding box
      let boundingBox: SvgIndexData["boundingBox"] = undefined;
      try {
        if (elem.getBBox && typeof elem.getBBox === "function") {
          const bbox = elem.getBBox();
          boundingBox = {
            x: Math.round(bbox.x * 100) / 100,
            y: Math.round(bbox.y * 100) / 100,
            width: Math.round(bbox.width * 100) / 100,
            height: Math.round(bbox.height * 100) / 100,
          };
        }
      } catch (e) {
        // Element may not support getBBox
      }

      systemIndex[id] = { viewBox: rootViewBox, boundingBox };
    });

    index[system] = systemIndex;
    console.log(`  ✓ Extracted ${Object.keys(systemIndex).length} path IDs`);
  }

  return index;
}

function generateVersionHash(): string {
  const timestamp = new Date().toISOString();
  const svgHashes = Object.values(SYSTEM_SVG_MAP)
    .map(svgPath => {
      const fullPath = path.join(__dirname, "..", svgPath);
      if (fs.existsSync(fullPath)) {
        const stats = fs.statSync(fullPath);
        return stats.mtime.getTime().toString();
      }
      return "";
    })
    .join("-");

  const hash = crypto
    .createHash("md5")
    .update(svgHashes)
    .digest("hex")
    .substring(0, 8);
  return `${timestamp}+${hash}`;
}

async function main() {
  console.log("🔍 Extracting SVG path metadata...\n");
  const index = await extractSvgPaths();

  const indexWithVersion: SvgIndex = {
    _version: generateVersionHash(),
    ...index,
  };

  // Save to frontend public directory
  const outputPath = path.join(
    __dirname,
    "..",
    "frontend",
    "public",
    "svgs-index.json"
  );
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(indexWithVersion, null, 2));

  console.log(`\n✅ SVG index saved to ${outputPath}`);
  console.log(`📋 Version: ${indexWithVersion._version}`);

  // Also save reference copy to prisma data for seed script
  const seedRefPath = path.join(
    __dirname,
    "..",
    "prisma",
    "data",
    "svg-paths-reference.json"
  );
  fs.mkdirSync(path.dirname(seedRefPath), { recursive: true });
  fs.writeFileSync(seedRefPath, JSON.stringify(index, null, 2));
  console.log(`📋 Reference saved to ${seedRefPath}`);
}

main().catch(console.error);
