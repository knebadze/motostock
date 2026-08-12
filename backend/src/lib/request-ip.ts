import type { Request } from "express";

// Single choke point for reading the client IP — relies on Express's own
// X-Forwarded-For parsing via `trust proxy` (set in app.ts), so any future
// change to which hop/header is trusted only needs to happen here.
export function getClientIp(req: Request): string | null {
  return req.ip ?? null;
}
