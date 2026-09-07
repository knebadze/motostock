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
import { usersRepository } from "../modules/users/users.repository.js";
import { sessionRepository } from "../modules/auth/session.repository.js";

// Throttles Session.lastSeenAt writes — without this, the admin "active
// sessions" page's freshness would cost a DB write on literally every
// authenticated request. lastSeenAt only needs to be fresh enough for an
// admin to tell a genuinely active session from an abandoned one, not
// second-accurate.
const LAST_SEEN_THROTTLE_MS = 5 * 60 * 1000;

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

    // Re-check the account in the database on every request instead of
    // trusting the role baked into the token at login time — otherwise a
    // demoted or deleted admin's still-unexpired token would keep granting
    // access until it naturally expires.
    const user = await usersRepository.findById(payload.sub);
    if (!user) return null;

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

    // Per-session revocation, independent of the account-wide tokenVersion
    // check above — this is what makes auth.controller.ts's logout actually
    // revoke *this* token server-side rather than only clearing the
    // browser's cookie (see jwt.ts's JwtPayload.sessionId).
    const session = await sessionRepository.findById(payload.sessionId);
    if (!session) {
      res.clearCookie(AUTH_COOKIE_NAME);
      return null;
    }

    if (Date.now() - session.lastSeenAt.getTime() > LAST_SEEN_THROTTLE_MS) {
      void sessionRepository
        .touchLastSeen(session.id)
        .catch((err) => logger.error({ err, sessionId: session.id }, "Failed to update session lastSeenAt"));
    }

    const role = user.role.name as RoleName;

    // Sliding idle timeout — every authenticated request resets the 2h idle
    // clock by reissuing the cookie, while loginAt/sessionId (and therefore
    // the absolute cap above and the session-revocation check above) stay
    // pinned to the original login instead of minting a new Session row on
    // every single request.
    const refreshed = await signJwt({
      sub: user.id,
      role,
      loginAt: payload.loginAt,
      tokenVersion: user.tokenVersion,
      sessionId: payload.sessionId,
    });
    await setAuthCookie(res, refreshed);

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
