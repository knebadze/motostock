import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { ApiError } from "../lib/ApiError.js";
import { logger } from "../lib/logger.js";

export function errorMiddleware(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  if (err instanceof ZodError) {
    // `code` lets the frontend show a translated generic message instead of
    // this hardcoded English text (see frontend's Errors.VALIDATION_FAILED)
    // — the per-field `details` messages stay backend-authored/English
    // either way (not translated), since nothing in the frontend actually
    // displays them; they exist for field-level highlighting only.
    res.status(400).json({
      error: {
        message: "Validation failed",
        code: "VALIDATION_FAILED",
        details: err.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
      },
    });
    return;
  }

  if (err instanceof ApiError) {
    res.status(err.statusCode).json({ error: { message: err.message, code: err.code, params: err.params } });
    return;
  }

  logger.error(err);
  res.status(500).json({ error: { message: "Internal server error" } });
}
