import crypto from "node:crypto";
import { env } from "../../config/env.js";
import { ApiError } from "../../lib/ApiError.js";
import { comparePassword, hashPassword } from "../../lib/password.js";
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
import { assertAccountNotLockedOut, recordAuthEvent } from "../fraud/fraud.service.js";
import { getResetTokenTtlMinutes, getVerificationTokenTtlHours } from "../settings/settings.service.js";
import { passwordResetTokenRepository } from "./password-reset-token.repository.js";
import { emailVerificationTokenRepository } from "./email-verification-token.repository.js";
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

export async function registerUser(input: RegisterInput, ipAddress: string | null) {
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

  const token = await signJwt({
    sub: user.id,
    role: ROLES.USER,
    loginAt: Date.now(),
    tokenVersion: user.tokenVersion,
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

export async function loginUser(input: LoginInput, ipAddress: string | null) {
  // Checked before anything else — IP-scoped authRateLimit (see
  // rateLimit.middleware.ts) can't catch a guessing attack spread across
  // many IPs against one account; this closes that gap regardless of which
  // IP the current attempt comes from.
  await assertAccountNotLockedOut(input.email);

  const user = await usersRepository.findByEmail(input.email);
  if (!user || !user.passwordHash) {
    // No such user, or an OAuth-only account with no password of its own —
    // same generic error either way, so we don't leak which case it is.
    await recordAuthEvent("LOGIN_FAILURE", input.email, user?.id ?? null, ipAddress);
    throw new ApiError(401, "Invalid email or password", "INVALID_CREDENTIALS");
  }

  const valid = await comparePassword(input.password, user.passwordHash);
  if (!valid) {
    await recordAuthEvent("LOGIN_FAILURE", input.email, user.id, ipAddress);
    throw new ApiError(401, "Invalid email or password", "INVALID_CREDENTIALS");
  }

  await recordAuthEvent("LOGIN_SUCCESS", user.email, user.id, ipAddress);

  const token = await signJwt({
    sub: user.id,
    role: user.role.name as RoleName,
    loginAt: Date.now(),
    tokenVersion: user.tokenVersion,
  });
  return { user: toSafeUser(user), token };
}

export async function verifyEmail(token: string) {
  const tokenHash = hashToken(token);
  const verificationToken = await emailVerificationTokenRepository.findByTokenHash(tokenHash);

  if (!verificationToken || verificationToken.usedAt || verificationToken.expiresAt < new Date()) {
    throw new ApiError(400, "დადასტურების ბმული არასწორია ან ვადაგასულია", "VERIFICATION_LINK_INVALID");
  }

  await usersRepository.markEmailVerified(verificationToken.userId);
  await emailVerificationTokenRepository.markUsed(verificationToken.id);
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

export async function resetPassword(input: ResetPasswordInput) {
  const tokenHash = hashToken(input.token);
  const resetToken = await passwordResetTokenRepository.findByTokenHash(tokenHash);

  if (!resetToken || resetToken.usedAt || resetToken.expiresAt < new Date()) {
    throw new ApiError(400, "აღდგენის ბმული არასწორია ან ვადაგასულია", "RESET_LINK_INVALID");
  }

  const passwordHash = await hashPassword(input.password);
  const user = await usersRepository.updatePasswordHash(resetToken.userId, passwordHash);
  await passwordResetTokenRepository.markUsed(resetToken.id);

  // tokenVersion was just bumped by updatePasswordHash above — signing with
  // that fresh value (not a stale one) means this response's own cookie
  // stays valid instead of immediately invalidating itself.
  const token = await signJwt({
    sub: user.id,
    role: user.role.name as RoleName,
    loginAt: Date.now(),
    tokenVersion: user.tokenVersion,
  });
  return { user: toSafeUser(user), token };
}
