import { z } from "zod";

export const SystemEnum = z.enum(["SKELETAL", "MUSCULAR", "VASCULAR", "NERVOUS", "ENDOCRINE"]);

export const CreateStructureSchema = z.object({
  name: z.string().min(1, "Name is required"),
  latinName: z.string().min(1, "Latin name is required"),
  system: SystemEnum,
  coordinates: z.record(z.any()).optional(),
  svgPathId: z.string().optional(),
  description: z.string().min(1, "Description is required"),
});

export const StructureParamSchema = z.object({
  id: z.string().uuid("Invalid structure ID"),
});

export type CreateStructureInput = z.infer<typeof CreateStructureSchema>;
export type StructureParam = z.infer<typeof StructureParamSchema>;
