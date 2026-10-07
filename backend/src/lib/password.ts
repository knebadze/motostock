import bcrypt from "bcrypt";
import { z } from "zod";

// New passwords: Latin letters, digits and symbols only (printable ASCII,
// space included) — the shop's rule, so no Georgian (or Cyrillic) letters,
// which also rules out "typed it on the wrong keyboard layout" lockouts.
// Being ASCII also makes every character exactly one byte, so the 72-char
// cap is bcrypt's real limit: it only ever uses the first 72 bytes of a
// password and silently drops the rest.
export const MAX_PASSWORD_LENGTH = 72;
const PASSWORD_ALLOWED_CHARS = /^[\x20-\x7E]*$/;

export const newPasswordField = z
  .string()
  .min(8)
  .max(MAX_PASSWORD_LENGTH)
  .regex(PASSWORD_ALLOWED_CHARS, "Password may contain only Latin letters, digits and symbols");

// Login only bounds the size (bcrypt work + request size) — it can't apply
// the new-password rules, since accounts created before them may have
// Georgian or longer passwords, which must still be able to log in (and
// then change to a compliant one).
export const loginPasswordField = z.string().min(1).max(1024);

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
