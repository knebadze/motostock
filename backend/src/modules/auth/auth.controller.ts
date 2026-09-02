import type { Request, Response } from "express";
import { ApiError } from "../../lib/ApiError.js";
import { AUTH_COOKIE_NAME, setAuthCookie } from "../../lib/jwt.js";
import { getClientIp } from "../../lib/request-ip.js";
import { mergeGuestDataIntoUser } from "../../middleware/guest-identity.middleware.js";
import {
  loginUser,
  registerUser,
  requestPasswordReset,
  resendVerificationEmail,
  resetPassword,
  verifyEmail,
} from "./auth.service.js";
import type {
  ForgotPasswordInput,
  LoginInput,
  RegisterInput,
  ResetPasswordInput,
  VerifyEmailInput,
} from "./auth.schema.js";

export async function register(
  req: Request<unknown, unknown, RegisterInput>,
  res: Response,
) {
  const { user, token } = await registerUser(req.body, getClientIp(req as unknown as Request));
  await setAuthCookie(res, token);
  await mergeGuestDataIntoUser(req, res, user.id);
  res.status(201).json({ user });
}

export async function login(
  req: Request<unknown, unknown, LoginInput>,
  res: Response,
) {
  const { user, token } = await loginUser(req.body, getClientIp(req as unknown as Request));
  await setAuthCookie(res, token);
  await mergeGuestDataIntoUser(req, res, user.id);
  res.status(200).json({ user });
}

export function logout(_req: Request, res: Response) {
  res.clearCookie(AUTH_COOKIE_NAME);
  res.status(204).send();
}

export async function forgotPassword(
  req: Request<unknown, unknown, ForgotPasswordInput>,
  res: Response,
) {
  await requestPasswordReset(req.body);
  // Same response whether or not the email was actually registered — see
  // requestPasswordReset's comment.
  res.status(200).json({ message: "თუ ეს ელფოსტა დარეგისტრირებულია, აღდგენის ბმული გამოგზავნილია" });
}

export async function resetPasswordHandler(
  req: Request<unknown, unknown, ResetPasswordInput>,
  res: Response,
) {
  const { user, token } = await resetPassword(req.body);
  await setAuthCookie(res, token);
  await mergeGuestDataIntoUser(req, res, user.id);
  res.status(200).json({ user });
}

export async function verifyEmailHandler(
  req: Request<unknown, unknown, VerifyEmailInput>,
  res: Response,
) {
  await verifyEmail(req.body.token);
  res.status(200).json({ ok: true });
}

export async function resendVerification(req: Request, res: Response) {
  if (!req.user) {
    throw new ApiError(401, "Not authenticated", "NOT_AUTHENTICATED");
  }
  await resendVerificationEmail(req.user.sub);
  res.status(200).json({ ok: true });
}
