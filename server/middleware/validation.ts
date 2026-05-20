import type { Request, Response, NextFunction } from "express";
import { type ZodSchema } from "zod";

/**
 * AsyncMiddleware typed per user preference
 */
type AsyncMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<void> | void;

/**
 * Generic validation middleware factory following the project's preferred pattern.
 * Validates req.body against a Zod schema and overwrites req.body with
 * the validated data on success.
 */
export function createValidationMiddleware<T>(schema: ZodSchema<T>): AsyncMiddleware {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      res.status(400).json({
        message: "Validation error",
        errors: result.error.errors.map(err => ({
          field: err.path.join("."),
          message: err.message
        }))
      });
      return;
    }

    // Overwrite with validated and typed data
    req.body = result.data;
    next();
  };
}

/**
 * Generic query validation middleware factory.
 * Validates req.query against a Zod schema and overwrites req.query with
 * the validated data on success.
 */
export function createQueryValidationMiddleware<T>(schema: ZodSchema<T>): AsyncMiddleware {
  return (req, res, next) => {
    const result = schema.safeParse(req.query);

    if (!result.success) {
      res.status(400).json({
        message: "Query validation error",
        errors: result.error.errors.map(err => ({
          field: err.path.join("."),
          message: err.message
        }))
      });
      return;
    }

    // Overwrite with validated and typed data
    req.query = result.data as any;
    next();
  };
}
