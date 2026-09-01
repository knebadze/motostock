import { Prisma } from "../generated/prisma/index.js";

export function isForeignKeyViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003";
}

// This project's Prisma client runs on a driver adapter (@prisma/adapter-pg),
// whose P2002 errors don't populate the classic `meta.target: string[]`
// shape at all — the field name only shows up inside
// `meta.driverAdapterError.cause.originalMessage`, quoting Postgres's own
// constraint name (e.g. `"Order_idempotencyKey_key"`), which follows
// Prisma's default `{Model}_{field}_key` naming. Checked live against a real
// duplicate-key insert before relying on it; the `target` branch stays as a
// fallback in case this ever runs against a non-adapter Prisma client.
function p2002ConstraintName(error: unknown): string | null {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") {
    return null;
  }
  const meta = error.meta as
    | { target?: unknown; driverAdapterError?: { cause?: { originalMessage?: unknown } } }
    | undefined;

  if (Array.isArray(meta?.target)) {
    return meta.target.join(",");
  }

  const originalMessage = meta?.driverAdapterError?.cause?.originalMessage;
  if (typeof originalMessage === "string") {
    return originalMessage.match(/"([A-Za-z0-9_]+)"/)?.[1] ?? null;
  }

  return null;
}

// Checks a caught error is a P2002 whose constraint name contains
// `fieldNameHint` (e.g. "productVariantId", "orderCode") — enough to tell
// which unique constraint fired without hardcoding the full generated
// constraint name at every call site.
export function isUniqueConstraintViolation(error: unknown, fieldNameHint: string): boolean {
  return p2002ConstraintName(error)?.includes(fieldNameHint) ?? false;
}
