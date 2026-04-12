import { Router } from "express";
import { asyncHandler } from "../middleware/asyncHandler";
import { validateRequest } from "../middleware/validation";
import { getAllStructures, getStructureById } from "../controllers/structureController";
import { StructureParamSchema } from "../lib/schemas";

export const structureRouter = Router();

structureRouter.get("/", asyncHandler(getAllStructures));
structureRouter.get("/:id", validateRequest(StructureParamSchema), asyncHandler(getStructureById));
