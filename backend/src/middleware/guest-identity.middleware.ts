import { randomUUID } from "node:crypto";
import type { Request, Response } from "express";
import { env } from "../config/env.js";
import { mergeGuestWishlistIntoUser } from "../modules/wishlist/wishlist.service.js";
import { mergeGuestCartIntoUser } from "../modules/cart/cart.service.js";
import { mergeGuestCompareIntoUser } from "../modules/compare/compare.service.js";
import { mergeGuestProductViewsIntoUser } from "../modules/product-views/product-views.service.js";
import { mergeGuestVehicleListingViewsIntoUser } from "../modules/vehicle-listing-views/vehicle-listing-views.service.js";

// One shared anonymous-visitor identity, reused by every guest-accessible
// feature (wishlist, cart, ...) instead of each minting its own cookie —
// a guest is one browser, not a different "guest" per feature.
export const GUEST_ID_COOKIE_NAME = "motostock_guest_id";
const GUEST_ID_COOKIE_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 365; // 1 year

// Reads the existing guest id cookie, or mints and sets a new one. Callers
// (resolveWishlistOwner, resolveCartOwner, ...) only call this once they've
// already confirmed the relevant feature's guest access is enabled — this
// itself has no opinion on that.
export function resolveGuestId(req: Request, res: Response): string {
  const existing = req.cookies?.[GUEST_ID_COOKIE_NAME] as string | undefined;
  if (existing) return existing;

  const guestId = randomUUID();
  res.cookie(GUEST_ID_COOKIE_NAME, guestId, {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: GUEST_ID_COOKIE_MAX_AGE_MS,
  });
  return guestId;
}

// Called right after setAuthCookie at every login entry point (password
// login/register/reset, Google/Facebook OAuth callbacks) — folds
// everything tied to a guest-id cookie (wishlist items, cart items, compare
// items, product/vehicle-listing views) into the now-known account, then
// clears the cookie. A no-op when there was no guest cookie (the common
// case — most logins aren't a guest converting).
export async function mergeGuestDataIntoUser(
  req: Pick<Request, "cookies">,
  res: Response,
  userId: number,
) {
  const guestId = req.cookies?.[GUEST_ID_COOKIE_NAME] as string | undefined;
  if (!guestId) return;

  await mergeGuestWishlistIntoUser(guestId, userId);
  await mergeGuestCartIntoUser(guestId, userId);
  await mergeGuestCompareIntoUser(guestId, userId);
  await mergeGuestProductViewsIntoUser(guestId, userId);
  await mergeGuestVehicleListingViewsIntoUser(guestId, userId);
  res.clearCookie(GUEST_ID_COOKIE_NAME);
}
