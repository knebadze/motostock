import { randomUUID } from "node:crypto";
import type { Request, Response } from "express";
import { env } from "../config/env.js";
import { logger } from "../lib/logger.js";
import { mergeGuestWishlistIntoUser } from "../modules/wishlist/wishlist.service.js";
import { mergeGuestCartIntoUser } from "../modules/cart/cart.service.js";
import { mergeGuestCompareIntoUser } from "../modules/compare/compare.service.js";
import { mergeGuestProductViewsIntoUser } from "../modules/product-views/product-views.service.js";
import { mergeGuestVehicleListingViewsIntoUser } from "../modules/vehicle-listing-views/vehicle-listing-views.service.js";
import { getGuestIdCookieMaxAgeDays } from "../modules/settings/settings.service.js";

// One shared anonymous-visitor identity, reused by every guest-accessible
// feature (wishlist, cart, ...) instead of each minting its own cookie —
// a guest is one browser, not a different "guest" per feature.
export const GUEST_ID_COOKIE_NAME = "motostock_guest_id";

// Reads the existing guest id cookie, or mints and sets a new one. Callers
// (resolveWishlistOwner, resolveCartOwner, ...) only call this once they've
// already confirmed the relevant feature's guest access is enabled — this
// itself has no opinion on that.
export async function resolveGuestId(req: Request, res: Response): Promise<string> {
  const existing = req.cookies?.[GUEST_ID_COOKIE_NAME] as string | undefined;
  if (existing) return existing;

  const guestIdCookieMaxAgeMs = (await getGuestIdCookieMaxAgeDays()) * 24 * 60 * 60 * 1000;
  const guestId = randomUUID();
  res.cookie(GUEST_ID_COOKIE_NAME, guestId, {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: guestIdCookieMaxAgeMs,
  });
  return guestId;
}

// Called right after setAuthCookie at every login entry point (password
// login/register/reset, Google/Facebook OAuth callbacks) — folds
// everything tied to a guest-id cookie (wishlist items, cart items, compare
// items, product/vehicle-listing views) into the now-known account, then
// clears the cookie. A no-op when there was no guest cookie (the common
// case — most logins aren't a guest converting).
//
// Best-effort — never throws. Every call site sets the auth cookie before
// calling this, so the login/register/reset has already succeeded from the
// user's point of view; a failure folding in guest data should cost them
// their guest cart/wishlist/compare/view-history at worst, not surface as a
// failed login (a thrown error here would otherwise reach the client as a
// 500 while the auth cookie is already staged on the response — logged in,
// but told login failed).
export async function mergeGuestDataIntoUser(
  req: Pick<Request, "cookies">,
  res: Response,
  userId: number,
) {
  const guestId = req.cookies?.[GUEST_ID_COOKIE_NAME] as string | undefined;
  if (!guestId) return;

  // Each category is run independently (not one try/catch around a
  // sequential chain) so a failure in, say, wishlist doesn't stop cart/
  // compare/view-history from merging too. Each of these re-reads whatever
  // guest-owned rows still exist under this guestId, so a category that
  // already fully merged is a safe no-op on retry — only the categories
  // that actually failed have anything left to do next time.
  const categories: Array<[string, () => Promise<void>]> = [
    ["wishlist", () => mergeGuestWishlistIntoUser(guestId, userId)],
    ["cart", () => mergeGuestCartIntoUser(guestId, userId)],
    ["compare", () => mergeGuestCompareIntoUser(guestId, userId)],
    ["productViews", () => mergeGuestProductViewsIntoUser(guestId, userId)],
    ["vehicleListingViews", () => mergeGuestVehicleListingViewsIntoUser(guestId, userId)],
  ];

  const results = await Promise.allSettled(categories.map(([, run]) => run()));

  let allSucceeded = true;
  results.forEach((result, index) => {
    if (result.status === "rejected") {
      allSucceeded = false;
      logger.error(
        { err: result.reason, userId, category: categories[index][0] },
        "Failed to merge a guest data category into user account",
      );
    }
  });

  // Clearing the cookie is what makes the guest data unreachable (it's the
  // only link back from guestId to this userId) — only do it once every
  // category actually succeeded. Leaving it set after a partial failure
  // means the still-unmerged categories get another chance on this user's
  // next login, instead of being orphaned under a guestId nothing points to
  // anymore.
  if (allSucceeded) {
    res.clearCookie(GUEST_ID_COOKIE_NAME);
  }
}
