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
import { usersRepository } from "../modules/users/users.repository.js";

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
    if (isSessionExpiredByAbsoluteCap(payload.loginAt)) {
      res.clearCookie(AUTH_COOKIE_NAME);
      return null;
    }

    // Re-check the account in the database on every request instead of
    // trusting the role baked into the token at login time — otherwise a
    // demoted or deleted admin's still-unexpired token would keep granting
    // access until it naturally expires.
    const user = await usersRepository.findById(payload.sub);
    if (!user) return null;

    const role = user.role.name as RoleName;

    // Sliding idle timeout — every authenticated request resets the 2h idle
    // clock by reissuing the cookie, while loginAt (and therefore the
    // absolute cap above) stays pinned to the original login.
    const refreshed = signJwt({ sub: user.id, role, loginAt: payload.loginAt });
    setAuthCookie(res, refreshed);

    return { sub: user.id, role, loginAt: payload.loginAt };
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
