import { Router } from "express";
import { asyncHandler } from "../middleware/asyncHandler";
import { validateRequest } from "../middleware/validation";
import {
  getAllStructures,
  getStructureById,
  getBulkStructures,
  getStructuresBySvgPath,
  searchStructures,
  getSystems,
} from "../controllers/structureController";
import { StructureParamSchema } from "../lib/schemas";

export const structureRouter = Router();

// Existing routes
structureRouter.get("/", asyncHandler(getAllStructures));

// New Phase 3 routes - place before /:id to avoid route collision
structureRouter.get("/systems/list", asyncHandler(getSystems));
structureRouter.get("/bulk/query", asyncHandler(getBulkStructures));
structureRouter.get("/by-svg-path/lookup", asyncHandler(getStructuresBySvgPath));
structureRouter.get("/search/semantic", asyncHandler(searchStructures));

// Parameterized route - must be last
structureRouter.get(
  "/:id",
  validateRequest(StructureParamSchema),
  asyncHandler(getStructureById)
);
