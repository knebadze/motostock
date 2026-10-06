import type { NextFunction, Request, Response } from "express";
import { ApiError } from "../lib/ApiError.js";
import {
  AUTH_COOKIE_NAME,
  isSessionExpiredByAbsoluteCap,
  setAuthCookie,
  signJwt,
  verifyJwt,
} from "../lib/jwt.js";
import type { JwtPayload } from "../lib/jwt.js";
import type { RoleName } from "../lib/roles.js";
import { logger } from "../lib/logger.js";
import { sessionRepository } from "../modules/auth/session.repository.js";
import { getSessionIdleTtlMinutes } from "../modules/settings/settings.service.js";

// Throttles Session.lastSeenAt writes — without this, the admin "active
// sessions" page's freshness would cost a DB write on literally every
// authenticated request. lastSeenAt only needs to be fresh enough for an
// admin to tell a genuinely active session from an abandoned one, not
// second-accurate.
const LAST_SEEN_THROTTLE_MS = 5 * 60 * 1000;

// Minimum age before a still-valid token is re-signed for the sliding idle
// timeout (see resolveAuthenticatedUser) — small against the idle TTL
// (minutes to hours), large against a single page load's request burst.
// Capped at half the idle TTL (see resolveAuthenticatedUser): an admin can
// set the idle TTL as low as 1 minute, and a fixed 60s would then let the
// token expire at the very moment it first became eligible for refresh,
// logging out even an active user every minute.
const TOKEN_REFRESH_INTERVAL_MS = 60 * 1000;

// Non-throwing core of requireAuth — returns the resolved user (also
// refreshing the sliding-expiry cookie as a side effect) or null on any
// failure, instead of rejecting the request. requireAuth below is a thin
// wrapper that turns null into a 401; resolveWishlistOwner (see the
// wishlist module) uses this same resolution but falls back to a guest
// identity instead of rejecting, when guest access is enabled.
export async function resolveAuthenticatedUser(
  req: Request,
  res: Response,
): Promise<JwtPayload | null> {
  const token = req.cookies?.[AUTH_COOKIE_NAME];
  if (!token) return null;

  try {
    const payload = verifyJwt(token);

    // Absolute session cap — enforced independently of the token's own (2h,
    // sliding) expiry, since an actively-used session keeps getting a fresh
    // 2h token below and would otherwise never expire on its own.
    if (await isSessionExpiredByAbsoluteCap(payload.loginAt)) {
      res.clearCookie(AUTH_COOKIE_NAME);
      return null;
    }

    // One query for both per-request checks below (user + session — used to
    // be two sequential lookups). Re-checking the account in the database on
    // every request, instead of trusting the role baked into the token at
    // login time, is what stops a demoted or deleted admin's still-unexpired
    // token from keeping its access.
    //
    // Per-session revocation: this is what makes auth.controller.ts's logout
    // actually revoke *this* token server-side rather than only clearing the
    // browser's cookie (see jwt.ts's JwtPayload.sessionId). A deleted
    // account takes its sessions with it (onDelete: Cascade), so it lands
    // here too. The userId match is defense in depth — the token is signed,
    // so its sessionId should only ever be one of its own user's sessions.
    const session = await sessionRepository.findForAuth(payload.sessionId);
    if (!session || session.userId !== payload.sub) {
      res.clearCookie(AUTH_COOKIE_NAME);
      return null;
    }
    const user = session.user;

    // A password change bumps User.tokenVersion (see users.repository.ts's
    // updatePasswordHash) — a token signed before that no longer matches and
    // is rejected here, which is what actually logs out every other
    // session/device on a password change (the account-holder's own current
    // session gets a freshly re-signed cookie in the same response that
    // changed the password — see users.controller.ts/auth.controller.ts).
    if (payload.tokenVersion !== user.tokenVersion) {
      res.clearCookie(AUTH_COOKIE_NAME);
      return null;
    }

    if (Date.now() - session.lastSeenAt.getTime() > LAST_SEEN_THROTTLE_MS) {
      void sessionRepository
        .touchLastSeen(session.id)
        .catch((err) => logger.error({ err, sessionId: session.id }, "Failed to update session lastSeenAt"));
    }

    const role = user.role.name as RoleName;

    // Sliding idle timeout — authenticated requests reset the idle clock by
    // reissuing the cookie, while loginAt/sessionId (and therefore the
    // absolute cap and the session-revocation check above) stay pinned to
    // the original login instead of minting a new Session row each time.
    // Throttled: one page load fires several authenticated requests at once,
    // and re-signing + Set-Cookie on every one of them bought nothing — a
    // token under TOKEN_REFRESH_INTERVAL_MS old is left as is (the idle
    // window just ends up to that much earlier). Always reissued when the
    // role changed, so the token never lags the account.
    const issuedAtMs = (payload as JwtPayload & { iat?: number }).iat;
    const tokenAgeMs = issuedAtMs != null ? Date.now() - issuedAtMs * 1000 : Infinity;
    const idleTtlMs = (await getSessionIdleTtlMinutes()) * 60 * 1000;
    const refreshAfterMs = Math.min(TOKEN_REFRESH_INTERVAL_MS, idleTtlMs / 2);
    if (tokenAgeMs > refreshAfterMs || payload.role !== role) {
      const refreshed = await signJwt({
        sub: user.id,
        role,
        loginAt: payload.loginAt,
        tokenVersion: user.tokenVersion,
        sessionId: payload.sessionId,
      });
      await setAuthCookie(res, refreshed);
    }

    return {
      sub: user.id,
      role,
      loginAt: payload.loginAt,
      tokenVersion: user.tokenVersion,
      sessionId: payload.sessionId,
    };
  } catch {
    return null;
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const user = await resolveAuthenticatedUser(req, res);
  if (!user) {
    next(new ApiError(401, "Not authenticated"));
    return;
  }

  req.user = user;
  next();
}

export function requireRole(...roles: JwtPayload["role"][]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      next(new ApiError(401, "Not authenticated"));
      return;
    }
    if (!roles.includes(req.user.role)) {
      next(new ApiError(403, "Insufficient permissions"));
      return;
    }
    next();
  };
}
