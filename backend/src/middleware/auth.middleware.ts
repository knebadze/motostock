import type { NextFunction, Request, Response } from "express";
import { ApiError } from "../lib/ApiError.js";
import { AUTH_COOKIE_NAME, verifyJwt } from "../lib/jwt.js";
import type { JwtPayload } from "../lib/jwt.js";

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const token = req.cookies?.[AUTH_COOKIE_NAME];

  if (!token) {
    next(new ApiError(401, "Not authenticated"));
    return;
  }

  try {
    req.user = verifyJwt(token);
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
