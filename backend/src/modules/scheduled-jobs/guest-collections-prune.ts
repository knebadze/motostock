import { prisma } from "../../config/prisma.js";
import { getGuestIdCookieMaxAgeDays } from "../settings/settings.service.js";

// Guest-owned cart/wishlist/compare rows (guestId set, no account) older
// than the guest-id cookie's lifetime can never be reached again: the cookie
// that identifies their owner was set before the row and has expired since
// (resolveGuestId only sets it when missing). Nothing deleted them, so they
// accumulated forever — and inflated the dashboard's "in carts" /
// "wishlisted" demand counts with long-abandoned guests. Same cutoff as the
// guest product/listing-view prunes.
export async function pruneStaleGuestCollections() {
  const maxAgeDays = await getGuestIdCookieMaxAgeDays();
  const cutoff = new Date(Date.now() - maxAgeDays * 24 * 60 * 60 * 1000);
  const guestRowsBefore = { guestId: { not: null }, createdAt: { lt: cutoff } };
  const [cart, wishlist, compare] = await Promise.all([
    prisma.cartItem.deleteMany({ where: guestRowsBefore }),
    prisma.wishlistItem.deleteMany({ where: guestRowsBefore }),
    prisma.compareItem.deleteMany({ where: guestRowsBefore }),
  ]);
  return { cartDeleted: cart.count, wishlistDeleted: wishlist.count, compareDeleted: compare.count };
}
