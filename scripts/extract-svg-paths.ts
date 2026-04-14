import * as fs from "fs";
import * as path from "path";
import { JSDOM } from "jsdom";

interface ExtractedPath {
  id: string;
  system: string;
  viewBox?: string;
  boundingBox?: { x: number; y: number; width: number; height: number };
}

const SYSTEM_SVG_MAP: Record<string, string> = {
  SKELETAL: "frontend/public/svgs/skeleton.svg",
  MUSCULAR: "frontend/public/svgs/muscles.svg",
  VASCULAR: "frontend/public/svgs/vascular.svg",
  NERVOUS: "frontend/public/svgs/nervous.svg",
  ENDOCRINE: "frontend/public/svgs/endocrine.svg",
};

async function extractSvgPaths(): Promise<ExtractedPath[]> {
  const allPaths: ExtractedPath[] = [];

  for (const [system, svgPath] of Object.entries(SYSTEM_SVG_MAP)) {
    const fullPath = path.join(__dirname, "..", svgPath);

    // Skip if SVG doesn't exist yet
    if (!fs.existsSync(fullPath)) {
      console.warn(
        `⚠️  ${svgPath} not found (system: ${system}), skipping`
      );
      continue;
    }

    const svgContent = fs.readFileSync(fullPath, "utf-8");
    const dom = new JSDOM(svgContent);
    const { document } = dom.window;

    // Extract viewBox from root SVG
    const svg = document.querySelector("svg");
    const viewBox = svg?.getAttribute("viewBox") || undefined;

    // Extract all paths with IDs and groups with IDs
    const elements = document.querySelectorAll("[id]");

    elements.forEach((elem) => {
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
      let boundingBox: {
        x: number;
        y: number;
        width: number;
        height: number;
      } | undefined;
      if (
        elem instanceof dom.window.SVGGraphicsElement &&
        typeof (elem as any).getBBox === "function"
      ) {
        try {
          const bbox = (elem as any).getBBox();
          boundingBox = {
            x: bbox.x,
            y: bbox.y,
            width: bbox.width,
            height: bbox.height,
          };
        } catch (e) {
          // Element may not support getBBox
        }
      }

      allPaths.push({
        id,
        system,
        viewBox,
        boundingBox,
      });
    });
  }

  return allPaths;
}

async function main() {
  console.log("🔍 Extracting SVG paths...");
  const paths = await extractSvgPaths();

  // Group by system
  const pathsBySystem = paths.reduce(
    (acc, p) => {
      if (!acc[p.system]) acc[p.system] = [];
      acc[p.system].push(p);
      return acc;
    },
    {} as Record<string, ExtractedPath[]>
  );

  // Output report
  Object.entries(pathsBySystem).forEach(([system, systemPaths]) => {
    console.log(`\n${system}: ${systemPaths.length} paths`);
    systemPaths.slice(0, 10).forEach((p) => console.log(`  - ${p.id}`));
    if (systemPaths.length > 10)
      console.log(
        `  ... and ${systemPaths.length - 10} more`
      );
  });

  // Save to file for seed script to use
  const outputPath = path.join(
    __dirname,
    "..",
    "prisma",
    "data",
    "svg-paths-inventory.json"
  );
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(pathsBySystem, null, 2));

  console.log(
    `\n✅ SVG path inventory saved to ${outputPath}`
  );
}

main().catch(console.error);
