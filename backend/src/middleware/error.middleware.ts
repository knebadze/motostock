import type { NextFunction, Request, Response } from "express";
import multer from "multer";
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

  // Multer's own limit errors (file too large, too many files, unexpected
  // field) carry no HTTP status — without this they fell through to the 500
  // branch below and were persisted to ErrorLog, so any client could fill
  // that table just by uploading an oversized file.
  if (err instanceof multer.MulterError) {
    const status = err.code === "LIMIT_FILE_SIZE" ? 413 : 400;
    const message = err.code === "LIMIT_FILE_SIZE" ? "ფაილი ძალიან დიდია" : "ფაილის ატვირთვა ვერ მოხერხდა";
    res.status(status).json({ error: { message } });
    return;
  }

  // Client errors raised by Express's own middleware (body-parser: malformed
  // JSON = 400, oversized body = 413, unsupported charset = 415, ...) carry
  // `status`/`statusCode` < 500. They're the caller's fault, not a server
  // bug — same reasoning as Multer above: answering them as a logged 500 let
  // any unauthenticated request write an ErrorLog row. pino-http still logs
  // the request line itself, so nothing goes completely unrecorded.
  const clientStatus = clientErrorStatus(err);
  if (clientStatus) {
    res.status(clientStatus).json({ error: { message: "Bad request" } });
    return;
  }

  logger.error(err);
  res.status(500).json({ error: { message: "Internal server error" } });
}

function clientErrorStatus(err: unknown): number | null {
  if (typeof err !== "object" || err === null) return null;
  const { status, statusCode } = err as { status?: unknown; statusCode?: unknown };
  const value = typeof status === "number" ? status : typeof statusCode === "number" ? statusCode : null;
  return value !== null && value >= 400 && value < 500 ? value : null;
}
