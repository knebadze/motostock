import { z } from "zod";

// Plain-function form — for values that don't go through a zod schema (an
// OAuth provider's profile.email, see oauth.service.ts) but still need to
// match how emailSchema below normalizes user-submitted addresses.
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

// Trims and lowercases before the format check runs (chaining .trim() /
// .toLowerCase() after z.email() instead would validate the raw,
// still-mixed-case/whitespace-padded input first and could reject a
// same-address-different-case submission that's actually fine). Without
// this, "Foo@Example.com" and "foo@example.com" are distinct rows against
// User.email's case-sensitive unique constraint — two accounts for the same
// mailbox, a login that only works with the exact casing used at
// registration, and a case-sensitive bypass of oauth.service.ts's
// password-account link guard (resolveOAuthEmailMatch never sees the
// existing row if the incoming case doesn't match it byte-for-byte).
export const emailSchema = z.string().trim().toLowerCase().pipe(z.email());
