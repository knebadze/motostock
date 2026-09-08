import { getGuestIdCookieMaxAgeDays, getRecentlyViewedLimit } from "../settings/settings.service.js";
import { toResponse as toProductResponse } from "../products/products.service.js";
import { productViewsRepository, type ProductViewOwner } from "./product-views.repository.js";

export async function recordProductView(owner: ProductViewOwner, productId: number): Promise<void> {
  await productViewsRepository.upsertView(owner, productId);
}

export async function listRecentlyViewed(owner: ProductViewOwner, limit?: number) {
  const resolvedLimit = limit ?? (await getRecentlyViewedLimit());
  const rows = await productViewsRepository.findByOwner(owner, resolvedLimit);
  return Promise.all(rows.map((row) => toProductResponse(row.product)));
}

// Called from guest-identity.middleware.ts's mergeGuestDataIntoUser, right
// alongside the wishlist/cart/compare merges. Unlike those (which just drop
// a colliding guest row), a collision here sums the two viewCounts into the
// user's row instead of discarding one — both rows represent genuine
// interest in the same product, so the signal is worth preserving. Each
// view is merged via its own atomic claim-then-upsert (see
// product-views.repository.ts's mergeGuestItem) so two concurrent logins on
// the same guest cookie can't double-sum a viewCount or crash on a row the
// other one already claimed.
export async function mergeGuestProductViewsIntoUser(guestId: string, userId: number) {
  const guestViews = await productViewsRepository.findByGuestId(guestId);

  for (const view of guestViews) {
    await productViewsRepository.mergeGuestItem(view, guestId, userId);
  }
}

// Unlike Session/VisitorVisit/etc. (pruned by their own retention windows —
// see auth.service.ts's pruneStaleAuthArtifacts and visitors.service.ts's
// pruneStaleVisitorData), ProductView had no retention policy at all. A
// logged-in user's own rows are bounded by how many distinct products *that
// user* has ever viewed, so they're left alone — the actual unbounded axis
// is the number of distinct GUEST identities that ever viewed anything,
// since every visitor who never retains the guest-id cookie (a crawler, a
// strict-privacy browser, a cookie-blocking extension — same population
// visitors.service.ts's own comment describes) mints a brand-new guestId,
// and therefore a brand-new permanent row, on every single product page
// view. The cutoff is the guest-id cookie's own configured lifetime: once a
// guest's cookie would have expired anyway, that guestId can never be
// merged into a real account (mergeGuestProductViewsIntoUser needs the
// still-live cookie to do that) or seen again, so the row is guaranteed
// dead weight past that point — same reasoning as the Session absolute-TTL
// cutoff used for pruneStaleSessions.
export async function pruneStaleGuestProductViews(): Promise<number> {
  const maxAgeDays = await getGuestIdCookieMaxAgeDays();
  const cutoff = new Date(Date.now() - maxAgeDays * 24 * 60 * 60 * 1000);
  return productViewsRepository.deleteOldGuestViews(cutoff);
}
