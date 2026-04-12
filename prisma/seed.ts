/// <reference types="node" />
import { db } from "../src/lib/db";

// Generate a random vector of length 1536
function generateRandomVector(): number[] {
  return Array.from({ length: 1536 }, () => Math.random() * 2 - 1);
}

async function main() {
  console.log("🌱 Seeding database with example bones...");

  // Clear existing data
  await db.structure.deleteMany({});

  const exampleBones = [
    {
      name: "Femur",
      latinName: "Femur",
      system: "SKELETAL" as const,
      coordinates: {
        x: 0,
        y: 0,
        z: 0,
      },
      svgPathId: "femur-path-001",
      description:
        "The femur is the longest and strongest bone in the human body. It connects the hip to the knee and bears most of the body weight during standing and walking.",
      embedding: generateRandomVector(),
    },
    {
      name: "Humerus",
      latinName: "Humerus",
      system: "SKELETAL" as const,
      coordinates: {
        x: 10,
        y: 5,
        z: 2,
      },
      svgPathId: "humerus-path-001",
      description:
        "The humerus is the bone of the upper arm. It articulates with the scapula at the shoulder and with the radius and ulna at the elbow.",
      embedding: generateRandomVector(),
    },
    {
      name: "Tibia",
      latinName: "Tibia",
      system: "SKELETAL" as const,
      coordinates: {
        x: 0,
        y: -20,
        z: 0,
      },
      svgPathId: "tibia-path-001",
      description:
        "The tibia, or shinbone, is the larger of the two bones in the lower leg. It articulates with the femur and fibula, bearing weight from the body.",
      embedding: generateRandomVector(),
    },
    {
      name: "Radius",
      latinName: "Radius",
      system: "SKELETAL" as const,
      coordinates: {
        x: 12,
        y: -5,
        z: 2,
      },
      svgPathId: "radius-path-001",
      description:
        "The radius is the lateral bone of the forearm, extending from the elbow to the wrist. It rotates around the ulna to enable pronation and supination.",
      embedding: generateRandomVector(),
    },
    {
      name: "Scapula",
      latinName: "Scapula",
      system: "SKELETAL" as const,
      coordinates: {
        x: 15,
        y: 10,
        z: -5,
      },
      svgPathId: "scapula-path-001",
      description:
        "The scapula is the large bone that forms the posterior and lateral part of the shoulder. It articulates with the humerus and clavicle.",
      embedding: generateRandomVector(),
    },
  ];

  for (const bone of exampleBones) {
    const structure = await db.structure.create({
      data: bone,
    });
    console.log(`✅ Created structure: ${structure.name}`);
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
