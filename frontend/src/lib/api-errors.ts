import { ApiRequestError } from "./api/client";

// The shape next-intl's useTranslations("Errors")/getTranslations("Errors")
// actually returns at runtime (a callable plus a few methods) — typed
// loosely here (plain `string` key, untyped values) rather than importing
// next-intl's precise per-namespace generated type, since error.code is a
// dynamic runtime value from the backend, never a compile-time-known
// literal.
type ErrorsTranslator = {
  (key: string, values?: Record<string, string | number>): string;
  has(key: string): boolean;
};

// The backend attaches a stable `code` (e.g. "OUT_OF_STOCK") to
// customer-facing errors instead of expecting its Georgian `message` to be
// shown as-is (the backend has no locale awareness — see ApiError.ts).
// Resolves that code against the `Errors` namespace when one exists,
// passing along any interpolation `params` (e.g. { limit: 4 }); otherwise
// falls back to a caller-supplied, already-translated message — covers both
// "backend sent no code" (network failure, or an error path that hasn't
// been given one yet) and "code sent but this frontend build predates it"
// (no matching Errors.* key), so a customer never sees raw backend text
// regardless of which case applies.
export function resolveApiErrorMessage(
  error: unknown,
  t: ErrorsTranslator,
  fallback: string,
): string {
  if (error instanceof ApiRequestError && error.code && t.has(error.code)) {
    return t(error.code, error.params);
  }
  return fallback;
}
