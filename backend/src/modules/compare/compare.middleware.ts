import type { NextFunction, Request, Response } from "express";
import { resolveAuthenticatedUser } from "../../middleware/auth.middleware.js";
import { resolveGuestId } from "../../middleware/guest-identity.middleware.js";

// Resolves the caller as either a logged-in user (req.user, same as
// requireAuth) or an anonymous visitor identified by the shared guest-id
// cookie (req.guestId, see guest-identity.middleware.ts) — unlike
// resolveWishlistOwner, guest access here is unconditional (no Settings
// toggle): comparing is a lightweight, no-commitment browsing aid, not
// something worth gating.
export async function resolveCompareOwner(req: Request, res: Response, next: NextFunction) {
  const user = await resolveAuthenticatedUser(req, res);
  if (user) {
    req.user = user;
    next();
    return;
  }

  req.guestId = await resolveGuestId(req, res);
  next();
}
