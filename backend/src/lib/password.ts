import bcrypt from "bcrypt";

const SALT_ROUNDS = 12;

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

export function comparePassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

// Computed once at process startup, at the same cost factor as every real
// hash (SALT_ROUNDS above) — a comparison against this costs the same as
// against a genuine one. Used by auth.service.ts's loginUser to close a
// timing side-channel: an unknown email or an OAuth-only account (no
// password of its own) used to return immediately with no bcrypt call at
// all, while a real password account always paid bcrypt's ~100-300ms —
// letting an attacker distinguish "registered with a password" from "not
// registered" purely from response latency, the same enumeration
// requestPasswordReset already guards against via its identical-response
// contract.
export const DUMMY_PASSWORD_HASH = bcrypt.hashSync("no-account-matches-this-placeholder", SALT_ROUNDS);
