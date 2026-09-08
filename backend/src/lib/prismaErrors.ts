import { Prisma } from "../generated/prisma/index.js";
import { ApiError } from "./ApiError.js";

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

// Shared by every admin create/update whose target has a real DB unique
// constraint (slug, code, key, ...) behind an earlier "is this available"
// pre-check — closes the TOCTOU race between that read and this write: a
// double-click before the submit button disables, or two admins acting on
// the same value at once, can both pass the pre-check before either
// commits. Without this, the loser hit a raw, uncaught P2002 (a bare 500)
// instead of the same clean conflict response the pre-check already gives
// the non-race case. First applied to lookups.service.ts/banks.service.ts;
// extracted here once the identical pattern turned up in ~10 more modules
// (order-statuses, products, categories, brands, models, product-brands,
// attribute-options, promo-codes, product-fitment, product-buy-together).
export async function runUniqueCheckedWrite<T>(
  write: () => Promise<T>,
  fieldNameHint: string,
  conflictMessage: string,
  statusCode = 409,
): Promise<T> {
  try {
    return await write();
  } catch (error) {
    if (isUniqueConstraintViolation(error, fieldNameHint)) {
      throw new ApiError(statusCode, conflictMessage);
    }
    throw error;
  }
}
