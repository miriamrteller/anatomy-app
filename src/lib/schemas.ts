import { z } from "zod";

export const SystemEnum = z.enum(["SKELETAL", "MUSCULAR", "VASCULAR", "NERVOUS", "ENDOCRINE"]);

export const StructureCategoryEnum = z.enum([
  "BONE",
  "CARTILAGE",
  "LIGAMENT",
  "MUSCLE",
  "TENDON",
  "ORGAN",
  "VASCULAR_VESSEL",
  "NERVE",
  "LYMPH_NODE",
  "TISSUE",
]);

export const SvgPathSchema = z.object({
  id: z.string().min(1, "SVG path ID required"),
  viewBox: z.string().optional(),
  x: z.number().optional(),
  y: z.number().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
  boundingBox: z.any().optional(),
  system: SystemEnum.optional(),
});

export const CreateStructureSchema = z.object({
  name: z.string().min(1, "Name is required"),
  latinName: z.string().min(1, "Latin name is required"),
  system: SystemEnum,
  category: StructureCategoryEnum,
  svgPaths: z.array(SvgPathSchema),
  aliases: z.array(z.string()).optional(),
  hierarchyParent: z.string().uuid().optional(),
  metadata: z.any().optional(),
  coordinates: z.record(z.any()).optional(),
  description: z.string().min(1, "Description is required"),
  svgPathId: z.string().optional(),
});

export const BulkStructureQuerySchema = z.object({
  system: SystemEnum.optional(),
  limit: z.number().int().min(1).max(1000).default(100),
  offset: z.number().int().min(0).default(0),
});

export const SvgPathLookupSchema = z.object({
  pathIds: z.string().transform((s) => s.split(",").map((id) => id.trim())),
  system: SystemEnum.optional(),
});

export const SemanticSearchSchema = z.object({
  q: z.string().min(1, "Search query required").max(500),
  system: SystemEnum.optional(),
  limit: z.number().int().min(1).max(100).default(10),
});

export const StructureParamSchema = z.object({
  id: z.string().uuid("Invalid structure ID"),
});

export type CreateStructureInput = z.infer<typeof CreateStructureSchema>;
export type SvgPath = z.infer<typeof SvgPathSchema>;
export type StructureParam = z.infer<typeof StructureParamSchema>;
export type BulkStructureQuery = z.infer<typeof BulkStructureQuerySchema>;
export type SvgPathLookup = z.infer<typeof SvgPathLookupSchema>;
export type SemanticSearch = z.infer<typeof SemanticSearchSchema>;
