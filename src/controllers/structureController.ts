import { Request, Response } from "express";
import { db } from "../lib/db";
import { StructureParamSchema } from "../lib/schemas";
import { AppError } from "../lib/errors";

export const getAllStructures = async (_req: Request, res: Response) => {
  const structures = await db.structure.findMany({
    select: {
      id: true,
      name: true,
      latinName: true,
      system: true,
      svgPathId: true,
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
      coordinates: true,
      svgPathId: true,
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
