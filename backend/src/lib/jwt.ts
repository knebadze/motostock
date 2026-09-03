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
  // Snapshot of User.tokenVersion at sign time — auth.middleware.ts's
  // resolveAuthenticatedUser rejects a token whose tokenVersion no longer
  // matches the account's current one. Bumped on every password change (see
  // users.repository.ts's updatePasswordHash), so this is what actually
  // invalidates every other still-unexpired session/device when a password
  // changes — the idle/absolute TTLs above only bound how long a token can
  // live on their own, not this.
  tokenVersion: number;
  // Id of this token's Session row (auth/session.repository.ts) — minted
  // once at login and, like loginAt, carried unchanged through every
  // sliding renewal (never re-minted per request). This is what makes
  // logout an actual server-side revocation instead of just a
  // browser-side cookie clear: resolveAuthenticatedUser rejects a token
  // whose Session row is gone, and auth.controller.ts's logout is what
  // deletes it. Deliberately per-session, not the account-wide
  // tokenVersion above — logging out of one device must not also log out
  // every other device the way a password change intentionally does.
  sessionId: number;
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
