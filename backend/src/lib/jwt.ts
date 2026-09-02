import jwt from "jsonwebtoken";
import type { Response } from "express";
import { env } from "../config/env.js";
import { getSessionAbsoluteTtlDays, getSessionIdleTtlMinutes } from "../modules/settings/settings.service.js";
import type { RoleName } from "./roles.js";

export const AUTH_COOKIE_NAME = "motostock_token";

export type JwtPayload = {
  sub: number;
  role: RoleName;
  // Epoch ms of the original login — carried unchanged across every sliding
  // renewal (never reset to "now"), so isSessionExpiredByAbsoluteCap can
  // still measure from the true session start.
  loginAt: number;
};

// Sliding idle timeout: every authenticated request reissues the cookie with
// a fresh expiry (default 2h, see requireAuth), so an actively-used session
// never hits this on its own. An account left untouched that long must log
// in again.
export async function signJwt(payload: JwtPayload): Promise<string> {
  const idleTtlSeconds = (await getSessionIdleTtlMinutes()) * 60;
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: idleTtlSeconds });
}

export function verifyJwt(token: string): JwtPayload {
  return jwt.verify(token, env.JWT_SECRET) as unknown as JwtPayload;
}

// Absolute cap, independent of activity — even a continuously-active session
// (cookie kept fresh by the sliding renewal above) is force-expired (default
// 30 days) after the original login, so a stolen cookie can't be ridden
// forever.
export async function isSessionExpiredByAbsoluteCap(loginAt: number): Promise<boolean> {
  const absoluteTtlMs = (await getSessionAbsoluteTtlDays()) * 24 * 60 * 60 * 1000;
  return Date.now() - loginAt > absoluteTtlMs;
}

// `Secure` cookies are silently dropped by the browser on a plain-HTTP
// origin — keying this off NODE_ENV alone breaks login on a production
// deploy that's still on IP+HTTP (no domain/TLS yet, see DEPLOY.md's
// two-phase rollout): the login request succeeds, but nothing ever gets
// stored, so every subsequent page looks unauthenticated. Deriving it from
// BACKEND_PUBLIC_URL instead means it tracks the real protocol — off during
// the HTTP test phase, on automatically once that's updated to `https://`
// for the real domain (already a required edit at that point regardless).
const COOKIE_SECURE = (env.BACKEND_PUBLIC_URL ?? "").startsWith("https://");

export async function setAuthCookie(res: Response, token: string) {
  const idleTtlSeconds = (await getSessionIdleTtlMinutes()) * 60;
  res.cookie(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: COOKIE_SECURE,
    sameSite: "lax",
    maxAge: idleTtlSeconds * 1000,
  });
}
