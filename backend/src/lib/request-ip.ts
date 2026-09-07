import type { Request } from "express";

// Single choke point for reading the client IP — relies on Express's own
// X-Forwarded-For parsing via `trust proxy` (set in app.ts), so any future
// change to which hop/header is trusted only needs to happen here.
export function getClientIp(req: Request): string | null {
  return req.ip ?? null;
}

// Same choke-point reasoning as getClientIp — raw, unvalidated client input
// (truncated defensively, since nothing bounds a User-Agent header's length),
// stored alongside a Session row purely for the admin's own "which device is
// this" identification, never parsed/trusted for any access-control decision.
const MAX_USER_AGENT_LENGTH = 500;

export function getClientUserAgent(req: Request): string | null {
  const userAgent = req.get("user-agent");
  return userAgent ? userAgent.slice(0, MAX_USER_AGENT_LENGTH) : null;
}
