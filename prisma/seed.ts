/// <reference types="node" />
import { randomUUID } from "node:crypto";
import { db } from "../src/lib/db";

// Generate a random vector of length 1536
function generateRandomVector(): number[] {
  return Array.from({ length: 1536 }, () => Math.random() * 2 - 1);
}

function toPgvectorLiteral(values: number[]): string {
  return `[${values.join(",")}]`;
}

async function main() {
  console.log("🌱 Seeding database with example bones...");

  // Clear existing data
  await db.structure.deleteMany({});

  const exampleBones = [
    {
      name: "Manubrium",
      latinName: "Manubrium sterni",
      system: "SKELETAL" as const,
      coordinates: {
        x: 0,
        y: 5,
        z: 0,
      },
      svgPathId: "Manubrium",
      description:
        "The manubrium is the upper part of the sternum (breastbone) that articulates with the clavicles and the first and second ribs.",
      embedding: generateRandomVector(),
    },
    {
      name: "Clavicle Right",
      latinName: "Clavicula dextra",
      system: "SKELETAL" as const,
      coordinates: {
        x: 15,
        y: 8,
        z: 0,
      },
      svgPathId: "ClavicleRight",
      description:
        "The right clavicle is a long slender bone that connects the sternum to the scapula, forming the shoulder girdle.",
      embedding: generateRandomVector(),
    },
    {
      name: "Clavicle Left",
      latinName: "Clavicula sinistra",
      system: "SKELETAL" as const,
      coordinates: {
        x: -15,
        y: 8,
        z: 0,
      },
      svgPathId: "ClavicleLeft",
      description:
        "The left clavicle is a long slender bone that connects the sternum to the scapula, forming the shoulder girdle.",
      embedding: generateRandomVector(),
    },
    {
      name: "Humerus Left",
      latinName: "Humerus sinister",
      system: "SKELETAL" as const,
      coordinates: {
        x: -10,
        y: 5,
        z: 2,
      },
      svgPathId: "HumerusLeft",
      description:
        "The left humerus is the bone of the upper arm. It articulates with the scapula at the shoulder and with the radius and ulna at the elbow.",
      embedding: generateRandomVector(),
    },
    {
      name: "Humerus Right",
      latinName: "Humerus dexter",
      system: "SKELETAL" as const,
      coordinates: {
        x: 10,
        y: 5,
        z: 2,
      },
      svgPathId: "HumerusRight",
      description:
        "The right humerus is the bone of the upper arm. It articulates with the scapula at the shoulder and with the radius and ulna at the elbow.",
      embedding: generateRandomVector(),
    },
    {
      name: "Ulna Left",
      latinName: "Ulna sinistra",
      system: "SKELETAL" as const,
      coordinates: {
        x: -12,
        y: -5,
        z: 2,
      },
      svgPathId: "UlnaLeft",
      description:
        "The left ulna is the medial bone of the forearm, extending from the elbow to the wrist. It provides stability and anchors muscles for arm movement.",
      embedding: generateRandomVector(),
    },
    {
      name: "Ulna Right",
      latinName: "Ulna dextra",
      system: "SKELETAL" as const,
      coordinates: {
        x: 12,
        y: -5,
        z: 2,
      },
      svgPathId: "UlnaRight",
      description:
        "The right ulna is the medial bone of the forearm, extending from the elbow to the wrist. It provides stability and anchors muscles for arm movement.",
      embedding: generateRandomVector(),
    },
    {
      name: "Radius Left",
      latinName: "Radius sinister",
      system: "SKELETAL" as const,
      coordinates: {
        x: -12,
        y: -5,
        z: 3,
      },
      svgPathId: "RadiusLeft",
      description:
        "The left radius is the lateral bone of the forearm, extending from the elbow to the wrist. It rotates around the ulna to enable pronation and supination.",
      embedding: generateRandomVector(),
    },
    {
      name: "Radius Right",
      latinName: "Radius dexter",
      system: "SKELETAL" as const,
      coordinates: {
        x: 12,
        y: -5,
        z: 3,
      },
      svgPathId: "RadiusRight",
      description:
        "The right radius is the lateral bone of the forearm, extending from the elbow to the wrist. It rotates around the ulna to enable pronation and supination.",
      embedding: generateRandomVector(),
    },
    {
      name: "Patella Left",
      latinName: "Patella sinistra",
      system: "SKELETAL" as const,
      coordinates: {
        x: -5,
        y: -15,
        z: 0,
      },
      svgPathId: "PatellaLeft",
      description:
        "The left patella (kneecap) is a sesamoid bone that protects the knee joint and improves the mechanical advantage of the quadriceps muscles.",
      embedding: generateRandomVector(),
    },
    {
      name: "Patella Right",
      latinName: "Patella dextra",
      system: "SKELETAL" as const,
      coordinates: {
        x: 5,
        y: -15,
        z: 0,
      },
      svgPathId: "PatellaRight",
      description:
        "The right patella (kneecap) is a sesamoid bone that protects the knee joint and improves the mechanical advantage of the quadriceps muscles.",
      embedding: generateRandomVector(),
    },
  ];

  for (const bone of exampleBones) {
    const structureId = randomUUID();
    const vectorLiteral = toPgvectorLiteral(bone.embedding);
    await db.$executeRaw`
      INSERT INTO structures (
        id,
        name,
        latin_name,
        system,
        coordinates,
        svg_path_id,
        description,
        embedding,
        updated_at
      )
      VALUES (
        ${structureId}::uuid,
        ${bone.name},
        ${bone.latinName},
        ${bone.system}::"System",
        ${JSON.stringify(bone.coordinates)}::jsonb,
        ${bone.svgPathId},
        ${bone.description},
        ${vectorLiteral}::vector,
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
