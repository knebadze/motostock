import pino from "pino";
import { env } from "../config/env.js";
import { prisma } from "../config/prisma.js";
import type { Prisma } from "../generated/prisma/index.js";

// Persists every logger.error(...) call to the ErrorLog table (see
// error-log.prisma) so it's visible in the admin panel, not just stdout —
// covers both the request errors error.middleware.ts logs and every
// swallowed background failure (FINA push, guest-cart merge, mail send...)
// that never reaches that middleware at all. Fire-and-forget and wrapped in
// its own try/catch: a logging call must never itself throw or block
// whatever code path triggered it, and a DB outage shouldn't take down
// logging with it.
//
// pino's log methods accept either `(msg)`, `(err)` (an Error is
// auto-recognized and serialized), or `(bindings, msg)` — this codebase
// only ever uses the last two, but all three are handled here defensively.
function persistErrorLog(args: unknown[]): void {
  let message = "Unknown error";
  let stack: string | null = null;
  let context: Record<string, unknown> | null = null;

  const [first, second] = args;
  if (first instanceof Error) {
    message = typeof second === "string" ? second : first.message;
    stack = first.stack ?? null;
  } else if (typeof first === "string") {
    message = first;
  } else if (first && typeof first === "object") {
    const { err, ...rest } = first as Record<string, unknown>;
    if (typeof second === "string") message = second;
    else if (err instanceof Error) message = err.message;
    if (err instanceof Error) stack = err.stack ?? null;
    if (Object.keys(rest).length > 0) context = rest;
  }

  prisma.errorLog
    .create({
      data: { message, stack, context: (context ?? undefined) as Prisma.InputJsonValue | undefined },
    })
    .catch(() => {
      // Nothing left to log this failure to without risking a loop.
    });
}

export const logger = pino({
  level: env.NODE_ENV === "production" ? "info" : "debug",
  transport:
    env.NODE_ENV === "development"
      ? { target: "pino-pretty", options: { colorize: true } }
      : undefined,
  hooks: {
    logMethod(args, method, level) {
      if (level === 50) {
        try {
          persistErrorLog(args);
        } catch {
          // Same reasoning as the .catch above — must never throw.
        }
      }
      return method.apply(this, args);
    },
  },
});
