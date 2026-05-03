/// <reference types="node" />
import { randomUUID } from "node:crypto";
import { readFileSync } from "fs";
import { join } from "path";
import { db } from "../src/lib/db";
import { mapOldIdsToNew } from "./migrations/data-svg-id-mapping";

interface BoneData {
  name: string;
  latinName: string;
  aliases: string[];
  system: "SKELETAL" | "MUSCULAR" | "VASCULAR" | "NERVOUS" | "ENDOCRINE";
  category: string;
  svgPathIds: Record<string, string[]>;
  description: string;
  metadata: Record<string, unknown>;
}

// Generate a random vector of length 1536 (for embeddings)
function generateRandomVector(): number[] {
  return Array.from({ length: 1536 }, () => Math.random() * 2 - 1);
}

function toPgvectorLiteral(values: number[]): string {
  return `[${values.join(",")}]`;
}

// Convert SvgPathIds from bone data to new array format
// Applies mapping from old PascalCase IDs to new kebab-case data-svg-id values
function buildSvgPathIds(
  svgPathIds: Record<string, string[]>,
  system: string
): string[] {
  const oldIds = svgPathIds[system] || [];
  return mapOldIdsToNew(oldIds);
}

async function main() {
  console.log("🌱 Seeding database with bones from bones.json...");

  // Clear existing data
  await db.structure.deleteMany({});

  // Load bones.json
  const bonesPath = join(process.cwd(), "prisma", "data", "bones.json");
  const bonesData: BoneData[] = JSON.parse(readFileSync(bonesPath, "utf-8"));

  // Seed all bones from bones.json
  for (const bone of bonesData) {
    const structureId = randomUUID();
    const vectorLiteral = toPgvectorLiteral(generateRandomVector());
    const svgPathIdArray = buildSvgPathIds(bone.svgPathIds, bone.system);

    await db.$executeRaw`
      INSERT INTO structures (
        id,
        name,
        latin_name,
        system,
        category,
        "svgPathIds",
        aliases,
        metadata,
        description,
        embedding,
        created_at,
        updated_at
      )
      VALUES (
        ${structureId}::uuid,
        ${bone.name},
        ${bone.latinName},
        ${bone.system}::"System",
        ${bone.category.toUpperCase()}::"StructureCategory",
        ${svgPathIdArray}::text[],
        ${bone.aliases}::text[],
        ${JSON.stringify(bone.metadata)}::jsonb,
        ${bone.description},
        ${vectorLiteral}::vector,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
      )
    `;

    console.log(`✅ Created structure: ${bone.name}`);
  }

  console.log("✨ Seeding completed successfully!");
}

main()
  .catch((error) => {
    console.error("❌ Seeding failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
