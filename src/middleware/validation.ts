import { Request, Response, NextFunction } from "express";
import { ZodSchema } from "zod";
import { AppError } from "../lib/errors.js";

export const validateRequest = (schema: ZodSchema) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      const validated = schema.parse(req.params || req.body || req.query);
      req.validatedData = validated;
      next();
    } catch (error: any) {
      const errors = error.errors || [];
      const formattedErrors = errors.map((err: any) => ({
        path: err.path.join("."),
        message: err.message,
      }));
      throw new AppError(400, `Validation failed: ${JSON.stringify(formattedErrors)}`);
    }
  };
};

export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: err.message,
      statusCode: err.statusCode,
    });
  }

  console.error("Unhandled error:", err);
  return res.status(500).json({
    error: "Internal server error",
    statusCode: 500,
  });
};
