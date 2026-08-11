import { toResponse as toProductResponse } from "../products/products.service.js";
import { productViewsRepository, type ProductViewOwner } from "./product-views.repository.js";

const DEFAULT_LIMIT = 10;

export async function recordProductView(owner: ProductViewOwner, productId: number): Promise<void> {
  await productViewsRepository.upsertView(owner, productId);
}

export async function listRecentlyViewed(owner: ProductViewOwner, limit = DEFAULT_LIMIT) {
  const rows = await productViewsRepository.findByOwner(owner, limit);
  return rows.map((row) => toProductResponse(row.product));
}

// Called from guest-identity.middleware.ts's mergeGuestDataIntoUser, right
// alongside the wishlist/cart/compare merges. Unlike those (which just drop
// a colliding guest row), a collision here sums the two viewCounts into the
// user's row before deleting the guest one — both rows represent genuine
// interest in the same product, so the signal is worth preserving rather
// than discarding.
export async function mergeGuestProductViewsIntoUser(guestId: string, userId: number) {
  const guestViews = await productViewsRepository.findByGuestId(guestId);

  for (const view of guestViews) {
    const existing = await productViewsRepository.findByOwnerAndProduct({ userId }, view.productId);
    if (existing) {
      await productViewsRepository.incrementViewCount(existing.id, view.viewCount);
      await productViewsRepository.delete(view.id);
    } else {
      await productViewsRepository.reassignToUser(view.id, userId);
    }
  }
}
