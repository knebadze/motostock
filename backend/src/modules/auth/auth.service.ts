import crypto from "node:crypto";
import { env } from "../../config/env.js";
import { ApiError } from "../../lib/ApiError.js";
import { comparePassword, hashPassword } from "../../lib/password.js";
import { signJwt } from "../../lib/jwt.js";
import { isMailerConfigured, sendPasswordResetEmail } from "../../lib/mailer.js";
import { ROLES, type RoleName } from "../../lib/roles.js";
import { usersRepository } from "../users/users.repository.js";
import { rolesRepository } from "../roles/roles.repository.js";
import { passwordResetTokenRepository } from "./password-reset-token.repository.js";
import type { ForgotPasswordInput, LoginInput, RegisterInput, ResetPasswordInput } from "./auth.schema.js";

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;

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
}) {
  return {
    id: user.id,
    email: user.email,
    name: `${user.firstName} ${user.lastName}`,
    role: user.role.name,
    createdAt: user.createdAt,
  };
}

export async function registerUser(input: RegisterInput) {
  const existing = await usersRepository.findByEmail(input.email);
  if (existing) {
    throw new ApiError(409, "Email already in use");
  }

  const userRole = await rolesRepository.findByName(ROLES.USER);
  if (!userRole) {
    throw new ApiError(500, "Default role is not configured");
  }

  const passwordHash = await hashPassword(input.password);
  const user = await usersRepository.create({
    email: input.email,
    firstName: input.firstName,
    lastName: input.lastName,
    passwordHash,
    roleId: userRole.id,
  });

  const token = signJwt({ sub: user.id, role: ROLES.USER, loginAt: Date.now() });
  return { user: toSafeUser(user), token };
}

export async function loginUser(input: LoginInput) {
  const user = await usersRepository.findByEmail(input.email);
  if (!user || !user.passwordHash) {
    // No such user, or an OAuth-only account with no password of its own —
    // same generic error either way, so we don't leak which case it is.
    throw new ApiError(401, "Invalid email or password");
  }

  const valid = await comparePassword(input.password, user.passwordHash);
  if (!valid) {
    throw new ApiError(401, "Invalid email or password");
  }

  const token = signJwt({ sub: user.id, role: user.role.name as RoleName, loginAt: Date.now() });
  return { user: toSafeUser(user), token };
}

export async function requestPasswordReset(input: ForgotPasswordInput) {
  if (!isMailerConfigured()) {
    throw new ApiError(400, "ელფოსტის გაგზავნა არ არის კონფიგურირებული");
  }

  const user = await usersRepository.findByEmail(input.email);
  // Always the same response whether or not the email is registered — this
  // endpoint must not let an attacker discover which emails have accounts.
  if (!user) {
    return;
  }

  const rawToken = crypto.randomBytes(32).toString("hex");
  await passwordResetTokenRepository.create({
    userId: user.id,
    tokenHash: hashToken(rawToken),
    expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
  });

  const resetUrl = `${env.FRONTEND_ORIGIN}/reset-password?token=${rawToken}`;
  await sendPasswordResetEmail(user.email, resetUrl);
}

export async function resetPassword(input: ResetPasswordInput) {
  const tokenHash = hashToken(input.token);
  const resetToken = await passwordResetTokenRepository.findByTokenHash(tokenHash);

  if (!resetToken || resetToken.usedAt || resetToken.expiresAt < new Date()) {
    throw new ApiError(400, "აღდგენის ბმული არასწორია ან ვადაგასულია");
  }

  const passwordHash = await hashPassword(input.password);
  const user = await usersRepository.updatePasswordHash(resetToken.userId, passwordHash);
  await passwordResetTokenRepository.markUsed(resetToken.id);

  const token = signJwt({ sub: user.id, role: user.role.name as RoleName, loginAt: Date.now() });
  return { user: toSafeUser(user), token };
}
