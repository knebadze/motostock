import type { NextFunction, Request, Response } from "express";

const MAX_DEPTH = 20;

function containsNullByte(value: unknown, depth = 0): boolean {
  if (typeof value === "string") return value.includes("\0");
  if (depth > MAX_DEPTH || value == null || typeof value !== "object") return false;
  if (Array.isArray(value)) return value.some((item) => containsNullByte(item, depth + 1));
  return Object.entries(value).some(([key, item]) => key.includes("\0") || containsNullByte(item, depth + 1));
}

// Rejects any request carrying a NUL byte (U+0000) in its URL, query or JSON
// body. PostgreSQL text can't hold one, so it used to reach Prisma and fail
// there as a 500 (22021 "invalid byte sequence for encoding UTF8: 0x00") —
// e.g. scanners probing GET /api/products/by-slug/%00.env — filling ErrorLog
// and Sentry with noise. No legitimate input contains it. Route params are
// covered via the URL check (they're decoded from it later, per route).
// Same check for multipart text fields, which only exist once multer has
// parsed the form — so it runs as part of the upload middleware (see
// upload.middleware.ts), not the global one above.
export function rejectNullBytesInBody(req: Request, res: Response, next: NextFunction) {
  if (containsNullByte(req.body)) {
    res.status(400).json({ error: { message: "Invalid characters in request", code: "INVALID_CHARACTERS" } });
    return;
  }
  next();
}

export function rejectNullBytes(req: Request, res: Response, next: NextFunction) {
  if (
    /%00/i.test(req.originalUrl) ||
    req.originalUrl.includes("\0") ||
    containsNullByte(req.query) ||
    containsNullByte(req.body)
  ) {
    res.status(400).json({ error: { message: "Invalid characters in request", code: "INVALID_CHARACTERS" } });
    return;
  }
  next();
}
