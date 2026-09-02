import type { NextFunction, Request, Response } from "express";
import { ApiError } from "../../lib/ApiError.js";
import { resolveAuthenticatedUser } from "../../middleware/auth.middleware.js";
import { resolveGuestId } from "../../middleware/guest-identity.middleware.js";
import { isGuestWishlistEnabled } from "../settings/settings.service.js";

// Resolves the caller as either a logged-in user (req.user, same as
// requireAuth) or — only when guest wishlist access is enabled in Settings
// — an anonymous visitor identified by the shared guest-id cookie
// (req.guestId, see guest-identity.middleware.ts). Rejects with 401 only
// when neither applies.
export async function resolveWishlistOwner(req: Request, res: Response, next: NextFunction) {
  const user = await resolveAuthenticatedUser(req, res);
  if (user) {
    req.user = user;
    next();
    return;
  }

  if (!(await isGuestWishlistEnabled())) {
    next(new ApiError(401, "Not authenticated", "NOT_AUTHENTICATED"));
    return;
  }

  req.guestId = await resolveGuestId(req, res);
  next();
}
