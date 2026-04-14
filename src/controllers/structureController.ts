import { Request, Response } from "express";
import { db } from "../lib/db";
import {
  StructureParamSchema,
  BulkStructureQuerySchema,
  SvgPathLookupSchema,
  SemanticSearchSchema,
} from "../lib/schemas";
import { AppError } from "../lib/errors";

export const getAllStructures = async (_req: Request, res: Response) => {
  const structures = await db.structure.findMany({
    select: {
      id: true,
      name: true,
      latinName: true,
      system: true,
      category: true,
      svgPaths: true,
      aliases: true,
      description: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  res.status(200).json({
    success: true,
    data: structures,
    count: structures.length,
  });
};

export const getStructureById = async (req: Request, res: Response) => {
  const { id } = StructureParamSchema.parse(req.params);

  const structure = await db.structure.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      latinName: true,
      system: true,
      category: true,
      coordinates: true,
      svgPaths: true,
      aliases: true,
      metadata: true,
      description: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!structure) {
    throw new AppError(404, `Structure with id ${id} not found`);
  }

  res.status(200).json({
    success: true,
    data: structure,
  });
};

/**
 * Get bulk structures with pagination
 * GET /structures/bulk?system=SKELETAL&limit=50&offset=0
 */
export const getBulkStructures = async (req: Request, res: Response) => {
  const query = BulkStructureQuerySchema.parse(req.query);

  const where: Record<string, unknown> = {};
  if (query.system) {
    where.system = query.system;
  }

  const [structures, total] = await Promise.all([
    db.structure.findMany({
      where,
      select: {
        id: true,
        name: true,
        latinName: true,
        system: true,
        category: true,
        svgPaths: true,
        aliases: true,
        description: true,
        updatedAt: true,
      },
      take: query.limit,
      skip: query.offset,
      orderBy: { name: "asc" },
    }),
    db.structure.count({ where }),
  ]);

  res.status(200).json({
    success: true,
    data: structures,
    count: structures.length,
    total,
    limit: query.limit,
    offset: query.offset,
  });
};

/**
 * Get structures by SVG path IDs
 * GET /structures/by-svg-path?pathIds=Skull,Manubrium&system=SKELETAL
 */
export const getStructuresBySvgPath = async (req: Request, res: Response) => {
  const query = SvgPathLookupSchema.parse(req.query);

  // Fetch structures and filter by SVG path IDs in application layer
  // (simpler than complex JSON queries in Prisma)
  const allStructures = await db.structure.findMany({
    where: query.system ? { system: query.system as any } : {},
    select: {
      id: true,
      name: true,
      latinName: true,
      system: true,
      category: true,
      svgPaths: true,
      aliases: true,
      metadata: true,
      description: true,
    },
  });

  // Filter for structures containing any of the requested SVG path IDs
  const structures = allStructures.filter((struct) => {
    const svgPathData = struct.svgPaths as Array<{ id: string; system?: string }>;
    return svgPathData.some((path) => query.pathIds.includes(path.id));
  });

  if (structures.length === 0) {
    throw new AppError(
      404,
      `No structures found for svg paths: ${query.pathIds.join(", ")}`
    );
  }

  res.status(200).json({
    success: true,
    data: structures,
    count: structures.length,
    requestedPaths: query.pathIds,
  });
};

/**
 * Search structures by semantic similarity (requires embeddings)
 * GET /structures/search?q=arm%20bone&system=SKELETAL&limit=10
 */
export const searchStructures = async (req: Request, res: Response) => {
  const query = SemanticSearchSchema.parse(req.query);

  // TODO: Integrate with LLM embedding service in Phase 5
  // For now, return text-based search results
  const searchTerms = query.q.toLowerCase();

  const where: Record<string, unknown> = {};
  if (query.system) {
    where.system = query.system as any;
  }

  const allStructures = await db.structure.findMany({
    where,
    select: {
      id: true,
      name: true,
      latinName: true,
      system: true,
      category: true,
      svgPaths: true,
      aliases: true,
      description: true,
    },
  });

  // Filter for text match in name, latin name, description, and aliases
  const structures = allStructures
    .filter((struct) => {
      const matchName = struct.name.toLowerCase().includes(searchTerms);
      const matchLatin = struct.latinName.toLowerCase().includes(searchTerms);
      const matchDesc = struct.description
        .toLowerCase()
        .includes(searchTerms);
      const matchAlias = (struct.aliases as string[]).some((alias) =>
        alias.toLowerCase().includes(searchTerms)
      );

      return matchName || matchLatin || matchDesc || matchAlias;
    })
    .slice(0, query.limit);

  if (structures.length === 0) {
    throw new AppError(404, `No structures found matching: ${query.q}`);
  }

  res.status(200).json({
    success: true,
    data: structures,
    count: structures.length,
    query: query.q,
  });
};

/**
 * Get available anatomical systems
 * GET /systems
 */
export const getSystems = async (_req: Request, res: Response) => {
  const systems = [
    {
      id: "SKELETAL",
      name: "Skeletal System",
      description: "Bones, cartilage, and ligaments",
      status: "implemented",
    },
    {
      id: "MUSCULAR",
      name: "Muscular System",
      description: "Muscles and tendons",
      status: "planned",
    },
    {
      id: "VASCULAR",
      name: "Vascular System",
      description: "Blood vessels and circulation",
      status: "planned",
    },
    {
      id: "NERVOUS",
      name: "Nervous System",
      description: "Nerves and neural pathways",
      status: "planned",
    },
    {
      id: "ENDOCRINE",
      name: "Endocrine System",
      description: "Glands and hormone production",
      status: "planned",
    },
  ];

  res.status(200).json({
    success: true,
    data: systems,
    count: systems.length,
  });
};
