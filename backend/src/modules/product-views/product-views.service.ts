import { getRecentlyViewedLimit } from "../settings/settings.service.js";
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
