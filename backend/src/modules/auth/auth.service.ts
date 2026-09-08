import crypto from "node:crypto";
import { env } from "../../config/env.js";
import { ApiError } from "../../lib/ApiError.js";
import { comparePassword, hashPassword, DUMMY_PASSWORD_HASH } from "../../lib/password.js";
import { signJwt } from "../../lib/jwt.js";
import { isUniqueConstraintViolation } from "../../lib/prismaErrors.js";
import {
  isMailerConfigured,
  sendPasswordResetEmail,
  sendVerificationEmail,
} from "../../lib/mailer.js";
import { logger } from "../../lib/logger.js";
import { ROLES, type RoleName } from "../../lib/roles.js";
import { usersRepository } from "../users/users.repository.js";
import { rolesRepository } from "../roles/roles.repository.js";
import { runWithAccountLockoutGuard, recordAuthEvent } from "../fraud/fraud.service.js";
import {
  getResetTokenTtlMinutes,
  getVerificationTokenTtlHours,
  getSessionAbsoluteTtlDays,
} from "../settings/settings.service.js";
import { passwordResetTokenRepository } from "./password-reset-token.repository.js";
import { emailVerificationTokenRepository } from "./email-verification-token.repository.js";
import { sessionRepository } from "./session.repository.js";
import type { ForgotPasswordInput, LoginInput, RegisterInput, ResetPasswordInput } from "./auth.schema.js";

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function toSafeUser(user: {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: { name: string };
  createdAt: Date;
  emailVerifiedAt: Date | null;
}) {
  return {
    id: user.id,
    email: user.email,
    name: `${user.firstName} ${user.lastName}`,
    role: user.role.name,
    createdAt: user.createdAt,
    emailVerified: user.emailVerifiedAt != null,
  };
}

async function issueVerificationEmail(userId: number, email: string): Promise<void> {
  if (!isMailerConfigured()) return;

  const verificationTokenTtlMs = (await getVerificationTokenTtlHours()) * 60 * 60 * 1000;
  const rawToken = crypto.randomBytes(32).toString("hex");
  await emailVerificationTokenRepository.create({
    userId,
    tokenHash: hashToken(rawToken),
    expiresAt: new Date(Date.now() + verificationTokenTtlMs),
  });

  const verifyUrl = `${env.FRONTEND_ORIGIN}/verify-email?token=${rawToken}`;
  await sendVerificationEmail(email, verifyUrl);
}

export async function registerUser(
  input: RegisterInput,
  ipAddress: string | null,
  userAgent: string | null,
) {
  const existing = await usersRepository.findByEmail(input.email);
  if (existing) {
    throw new ApiError(409, "Email already in use", "EMAIL_ALREADY_IN_USE");
  }

  const userRole = await rolesRepository.findByName(ROLES.USER);
  if (!userRole) {
    throw new ApiError(500, "Default role is not configured", "INTERNAL_CONFIG_ERROR");
  }

  const passwordHash = await hashPassword(input.password);
  let user;
  try {
    user = await usersRepository.create({
      email: input.email,
      firstName: input.firstName,
      lastName: input.lastName,
      passwordHash,
      roleId: userRole.id,
    });
  } catch (err) {
    // A concurrent request (another password registration double-submit, or
    // an OAuth signup racing this one — see oauth.service.ts's
    // findOrCreateOAuthUser) can pass the findByEmail check above before
    // either commits — surface the same clean 409 the pre-check above gives
    // the non-race case, instead of a raw 500.
    if (!isUniqueConstraintViolation(err, "email")) throw err;
    throw new ApiError(409, "Email already in use", "EMAIL_ALREADY_IN_USE");
  }

  const session = await sessionRepository.create(user.id, { ipAddress, userAgent });
  const token = await signJwt({
    sub: user.id,
    role: ROLES.USER,
    loginAt: Date.now(),
    tokenVersion: user.tokenVersion,
    sessionId: session.id,
  });

  await recordAuthEvent("REGISTER", user.email, user.id, ipAddress);

  // Fire-and-forget — registration must succeed (and log the user in, per
  // the "soft gate" decision: checkout requires verification, login/browsing
  // doesn't) even if sending the verification email fails or the mailer
  // isn't configured at all.
  issueVerificationEmail(user.id, user.email).catch((err) => {
    logger.error({ err, userId: user.id }, "Failed to send verification email");
  });

  return { user: toSafeUser(user), token };
}

export async function loginUser(
  input: LoginInput,
  ipAddress: string | null,
  userAgent: string | null,
) {
  // The lockout check (has this email failed too many times recently?), the
  // credential check, and recording a new failure are all done inside one
  // lock-held critical section, scoped to this email — see fraud.service.ts's
  // runWithAccountLockoutGuard for why (closes a TOCTOU race where a burst of
  // concurrent attempts could otherwise all read the same pre-attack failure
  // count and all slip through regardless of the configured threshold). IP-
  // scoped authRateLimit (rateLimit.middleware.ts) can't catch a guessing
  // attack spread across many IPs against one account; this closes that gap
  // too, regardless of which IP the current attempt comes from.
  const user = await runWithAccountLockoutGuard(input.email, ipAddress, async () => {
    const candidate = await usersRepository.findByEmail(input.email);
    if (!candidate || !candidate.passwordHash) {
      // No such user, or an OAuth-only account with no password of its own —
      // same generic error either way, so we don't leak which case it is.
      // Still pays bcrypt's cost against a dummy hash before returning —
      // otherwise this branch returns near-instantly while a real password
      // account always waits on comparePassword below, and the latency gap
      // itself becomes an account-enumeration side channel (same class of
      // leak requestPasswordReset already guards against via its identical
      // response, just via timing instead of response content).
      await comparePassword(input.password, DUMMY_PASSWORD_HASH);
      return { ok: false, userId: candidate?.id ?? null };
    }
    const valid = await comparePassword(input.password, candidate.passwordHash);
    if (!valid) {
      return { ok: false, userId: candidate.id };
    }
    return { ok: true, result: candidate };
  });

  await recordAuthEvent("LOGIN_SUCCESS", user.email, user.id, ipAddress);

  const session = await sessionRepository.create(user.id, { ipAddress, userAgent });
  const token = await signJwt({
    sub: user.id,
    role: user.role.name as RoleName,
    loginAt: Date.now(),
    tokenVersion: user.tokenVersion,
    sessionId: session.id,
  });
  return { user: toSafeUser(user), token };
}

export async function verifyEmail(token: string) {
  const tokenHash = hashToken(token);
  const verificationToken = await emailVerificationTokenRepository.findByTokenHash(tokenHash);

  if (!verificationToken || verificationToken.usedAt || verificationToken.expiresAt < new Date()) {
    throw new ApiError(400, "დადასტურების ბმული არასწორია ან ვადაგასულია", "VERIFICATION_LINK_INVALID");
  }

  // Claim the token before doing anything else — if two requests race with
  // the same token, both can reach this point having read usedAt: null
  // above, but only one of them gets count: 1 here (see the repository
  // method's comment). The loser gets the same "invalid or expired" error
  // as a genuinely reused link, instead of redundantly re-verifying.
  const claim = await emailVerificationTokenRepository.claim(verificationToken.id);
  if (claim.count === 0) {
    throw new ApiError(400, "დადასტურების ბმული არასწორია ან ვადაგასულია", "VERIFICATION_LINK_INVALID");
  }

  await usersRepository.markEmailVerified(verificationToken.userId);
}

export async function resendVerificationEmail(userId: number) {
  if (!isMailerConfigured()) {
    throw new ApiError(400, "ელფოსტის გაგზავნა არ არის კონფიგურირებული", "MAIL_NOT_CONFIGURED");
  }

  const user = await usersRepository.findById(userId);
  if (!user) {
    throw new ApiError(404, "მომხმარებელი ვერ მოიძებნა", "USER_NOT_FOUND");
  }
  if (user.emailVerifiedAt) {
    throw new ApiError(400, "ელფოსტა უკვე დადასტურებულია", "EMAIL_ALREADY_VERIFIED");
  }

  await issueVerificationEmail(user.id, user.email);
}

export async function requestPasswordReset(input: ForgotPasswordInput) {
  if (!isMailerConfigured()) {
    throw new ApiError(400, "ელფოსტის გაგზავნა არ არის კონფიგურირებული", "MAIL_NOT_CONFIGURED");
  }

  const user = await usersRepository.findByEmail(input.email);
  // Always the same response whether or not the email is registered — this
  // endpoint must not let an attacker discover which emails have accounts.
  if (!user) {
    return;
  }

  const resetTokenTtlMs = (await getResetTokenTtlMinutes()) * 60 * 1000;
  const rawToken = crypto.randomBytes(32).toString("hex");
  await passwordResetTokenRepository.create({
    userId: user.id,
    tokenHash: hashToken(rawToken),
    expiresAt: new Date(Date.now() + resetTokenTtlMs),
  });

  const resetUrl = `${env.FRONTEND_ORIGIN}/reset-password?token=${rawToken}`;
  // Fire-and-forget, same as registerUser's issueVerificationEmail — the
  // controller's response is identical whether or not the email is
  // registered (anti-enumeration), so it never depended on this send
  // actually completing, and a slow/unreachable SMTP host (mailer.ts's
  // timeouts now bound it, but needn't hold up this request even for that
  // long) shouldn't hang the forgot-password request either.
  sendPasswordResetEmail(user.email, resetUrl).catch((err) => {
    logger.error({ err, userId: user.id }, "Failed to send password reset email");
  });
}

export async function resetPassword(
  input: ResetPasswordInput,
  ipAddress: string | null,
  userAgent: string | null,
) {
  const tokenHash = hashToken(input.token);
  const resetToken = await passwordResetTokenRepository.findByTokenHash(tokenHash);

  if (!resetToken || resetToken.usedAt || resetToken.expiresAt < new Date()) {
    throw new ApiError(400, "აღდგენის ბმული არასწორია ან ვადაგასულია", "RESET_LINK_INVALID");
  }

  // Claim the token before touching the password — if two requests race
  // with the same token (e.g. a double-submitted reset form in two tabs),
  // both can reach this point having read usedAt: null above, but only one
  // of them gets count: 1 here (see the repository method's comment). The
  // loser gets the same "invalid or expired" error as a genuinely reused
  // link, instead of also overwriting the password it just set.
  const claim = await passwordResetTokenRepository.claim(resetToken.id);
  if (claim.count === 0) {
    throw new ApiError(400, "აღდგენის ბმული არასწორია ან ვადაგასულია", "RESET_LINK_INVALID");
  }

  const passwordHash = await hashPassword(input.password);
  const user = await usersRepository.updatePasswordHash(resetToken.userId, passwordHash);

  // Every pre-existing Session row for this user (across every device) is
  // now permanently unusable — the tokenVersion bump above already rejects
  // all of them — so they're deleted here rather than left to accumulate as
  // dead entries on the admin "active sessions" page. No exception (unlike
  // users.service.ts's changePassword): this request was never
  // authenticated to begin with, so there's no "current session" to spare.
  await sessionRepository.deleteAllForUserExcept(user.id);

  // tokenVersion was just bumped by updatePasswordHash above — signing with
  // that fresh value (not a stale one) means this response's own cookie
  // stays valid instead of immediately invalidating itself. A fresh Session
  // row too, created after the cleanup above so it isn't swept up by it.
  const session = await sessionRepository.create(user.id, { ipAddress, userAgent });
  const token = await signJwt({
    sub: user.id,
    role: user.role.name as RoleName,
    loginAt: Date.now(),
    tokenVersion: user.tokenVersion,
    sessionId: session.id,
  });
  return { user: toSafeUser(user), token };
}

// Three tables with the same shape of gap: each has a well-defined point
// past which a row can *never* be used again (Session — see its model
// comment: "harmless dead weight, not a bug" once past the JWT's absolute
// TTL cap; the two token tables — rejected once past their own expiresAt,
// see verifyEmail/resetPassword above), but nothing was ever sweeping them.
// Harmless individually, but all three only grow forever otherwise — same
// missing-retention-policy class VisitorPresence/VisitorVisit had before
// their own prune job. `createdAt` (Session's immutable loginAt), not
// lastSeenAt, is the safe Session cutoff: once now - createdAt exceeds the
// absolute TTL cap, isSessionExpiredByAbsoluteCap permanently rejects that
// token regardless of how recently it was used.
export async function pruneStaleAuthArtifacts(): Promise<{
  sessionsDeleted: number;
  passwordResetTokensDeleted: number;
  emailVerificationTokensDeleted: number;
}> {
  const absoluteTtlDays = await getSessionAbsoluteTtlDays();
  const sessionCutoff = new Date(Date.now() - absoluteTtlDays * 24 * 60 * 60 * 1000);

  const [sessionsDeleted, passwordResetTokensDeleted, emailVerificationTokensDeleted] = await Promise.all(
    [
      sessionRepository.deleteCreatedBefore(sessionCutoff),
      passwordResetTokenRepository.deleteExpired(),
      emailVerificationTokenRepository.deleteExpired(),
    ],
  );

  return { sessionsDeleted, passwordResetTokensDeleted, emailVerificationTokensDeleted };
}
