import { Request, Response, NextFunction } from "express";

declare global {
  namespace Express {
    interface Request {
      validatedData?: any;
    }
  }
}

export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
