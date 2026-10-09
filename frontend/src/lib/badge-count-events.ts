// Lets a cart/wishlist/compare mutation made anywhere on the page (a
// product/vehicle card's WishlistButton/CompareButton/AddToCartButton) tell
// the header's badge (CartDropdown/WishlistDropdown/CompareDropdown — each
// rendered exactly once) its fresh count, without those buttons sharing any
// React state with the header. Before this, the only way to refresh a
// header badge was `router.refresh()`, which re-runs the ENTIRE current
// route's server component tree (every product/filter/section fetch on the
// page) just to update one integer — this carries only the new count
// itself, fetched via the same cheap /count endpoint the header's own
// server-rendered initialCount already comes from.
export const CART_COUNT_CHANGED_EVENT = "cart-count-changed";
export const WISHLIST_COUNT_CHANGED_EVENT = "wishlist-count-changed";
export const COMPARE_COUNT_CHANGED_EVENT = "compare-count-changed";

// Last count this page knows for each collection — seeded by Header.tsx from
// the server-rendered badge counts, then kept current by every
// dispatchCountChanged below. Lets the batched "which of these items are
// already saved?" checks (useCollectionStatusMap) skip their request
// entirely when the collection is known to be empty — the common case for
// an anonymous visitor, whose every grid/carousel otherwise fired one.
const knownCounts = new Map<string, number>();

export function setKnownCount(eventName: string, count: number): void {
  knownCounts.set(eventName, count);
}

export function isCountKnownEmpty(eventName: string): boolean {
  return knownCounts.get(eventName) === 0;
}

export function dispatchCountChanged(eventName: string, count: number): void {
  knownCounts.set(eventName, count);
  window.dispatchEvent(new CustomEvent<number>(eventName, { detail: count }));
}
