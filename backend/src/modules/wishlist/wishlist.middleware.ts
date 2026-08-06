import { randomUUID } from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { env } from "../../config/env.js";
import { ApiError } from "../../lib/ApiError.js";
import { resolveAuthenticatedUser } from "../../middleware/auth.middleware.js";
import { isGuestWishlistEnabled } from "../settings/settings.service.js";
import { mergeGuestWishlistIntoUser } from "./wishlist.service.js";

export const GUEST_WISHLIST_COOKIE_NAME = "motostock_guest_wishlist_id";
const GUEST_WISHLIST_COOKIE_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 365; // 1 year

// Resolves the caller as either a logged-in user (req.user, same as
// requireAuth) or — only when guest wishlist access is enabled in Settings
// — an anonymous visitor identified by a long-lived cookie (req.wishlistGuestId).
// Rejects with 401 only when neither applies.
export async function resolveWishlistOwner(req: Request, res: Response, next: NextFunction) {
  const user = await resolveAuthenticatedUser(req, res);
  if (user) {
    req.user = user;
    next();
    return;
  }

  if (!(await isGuestWishlistEnabled())) {
    next(new ApiError(401, "Not authenticated"));
    return;
  }

  let guestId = req.cookies?.[GUEST_WISHLIST_COOKIE_NAME] as string | undefined;
  if (!guestId) {
    guestId = randomUUID();
    res.cookie(GUEST_WISHLIST_COOKIE_NAME, guestId, {
      httpOnly: true,
      secure: env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: GUEST_WISHLIST_COOKIE_MAX_AGE_MS,
    });
  }

  req.wishlistGuestId = guestId;
  next();
}

// Called right after setAuthCookie at every login entry point (password
// login/register/reset, Google/Facebook OAuth callbacks) — folds a guest
// wishlist cookie, if present, into the now-known account and clears it.
// A no-op when there was no guest cookie (the common case).
export async function mergeGuestWishlistCookie(
  req: Pick<Request, "cookies">,
  res: Response,
  userId: number,
) {
  const guestId = req.cookies?.[GUEST_WISHLIST_COOKIE_NAME] as string | undefined;
  if (!guestId) return;

  await mergeGuestWishlistIntoUser(guestId, userId);
  res.clearCookie(GUEST_WISHLIST_COOKIE_NAME);
}
