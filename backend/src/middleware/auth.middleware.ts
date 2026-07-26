import type { NextFunction, Request, Response } from "express";
import { ApiError } from "../lib/ApiError.js";
import { AUTH_COOKIE_NAME, verifyJwt } from "../lib/jwt.js";
import type { JwtPayload } from "../lib/jwt.js";
import type { RoleName } from "../lib/roles.js";
import { usersRepository } from "../modules/users/users.repository.js";

export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const token = req.cookies?.[AUTH_COOKIE_NAME];

  if (!token) {
    next(new ApiError(401, "Not authenticated"));
    return;
  }

  try {
    const payload = verifyJwt(token);

    // Re-check the account in the database on every request instead of
    // trusting the role baked into the token at login time — otherwise a
    // demoted or deleted admin's still-unexpired token would keep granting
    // access until it naturally expires (up to JWT_EXPIRES_IN).
    const user = await usersRepository.findById(payload.sub);
    if (!user) {
      next(new ApiError(401, "Invalid or expired session"));
      return;
    }

    req.user = { sub: user.id, role: user.role.name as RoleName };
    next();
  } catch {
    next(new ApiError(401, "Invalid or expired session"));
  }
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
