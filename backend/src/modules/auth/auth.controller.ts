import type { Request, Response } from "express";
import { AUTH_COOKIE_NAME, setAuthCookie } from "../../lib/jwt.js";
import { mergeGuestWishlistCookie } from "../wishlist/wishlist.middleware.js";
import { loginUser, registerUser, requestPasswordReset, resetPassword } from "./auth.service.js";
import type {
  ForgotPasswordInput,
  LoginInput,
  RegisterInput,
  ResetPasswordInput,
} from "./auth.schema.js";

export async function register(
  req: Request<unknown, unknown, RegisterInput>,
  res: Response,
) {
  const { user, token } = await registerUser(req.body);
  setAuthCookie(res, token);
  await mergeGuestWishlistCookie(req, res, user.id);
  res.status(201).json({ user });
}

export async function login(
  req: Request<unknown, unknown, LoginInput>,
  res: Response,
) {
  const { user, token } = await loginUser(req.body);
  setAuthCookie(res, token);
  await mergeGuestWishlistCookie(req, res, user.id);
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
  setAuthCookie(res, token);
  await mergeGuestWishlistCookie(req, res, user.id);
  res.status(200).json({ user });
}
