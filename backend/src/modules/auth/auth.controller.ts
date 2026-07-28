import type { Request, Response } from "express";
import ms from "ms";
import { env } from "../../config/env.js";
import { AUTH_COOKIE_NAME } from "../../lib/jwt.js";
import { loginUser, registerUser } from "./auth.service.js";
import type { LoginInput, RegisterInput } from "./auth.schema.js";

export function setAuthCookie(res: Response, token: string) {
  res.cookie(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: ms(env.JWT_EXPIRES_IN as ms.StringValue),
  });
}

export async function register(
  req: Request<unknown, unknown, RegisterInput>,
  res: Response,
) {
  const { user, token } = await registerUser(req.body);
  setAuthCookie(res, token);
  res.status(201).json({ user });
}

export async function login(
  req: Request<unknown, unknown, LoginInput>,
  res: Response,
) {
  const { user, token } = await loginUser(req.body);
  setAuthCookie(res, token);
  res.status(200).json({ user });
}

export function logout(_req: Request, res: Response) {
  res.clearCookie(AUTH_COOKIE_NAME);
  res.status(204).send();
}
