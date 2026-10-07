import { isKnownAuthState } from "./auth-state";
import { isGuestWishlistKnownEnabled } from "./guest-feature-state";
import {
  COMPARE_COUNT_CHANGED_EVENT,
  WISHLIST_COUNT_CHANGED_EVENT,
  isCountKnownEmpty,
} from "@/lib/badge-count-events";

// The shouldAttempt gates for useCollectionStatusMap's batched status
// checks. Wishlist: only for a logged-in visitor or a guest allowed to use
// it (otherwise it can only 401). Both: not when the header's own count says
// the collection is empty — no item on the page can be in it.
export function shouldCheckWishlistStatus(): boolean {
  return (isKnownAuthState() || isGuestWishlistKnownEnabled()) && !isCountKnownEmpty(WISHLIST_COUNT_CHANGED_EVENT);
}

export function shouldCheckCompareStatus(): boolean {
  return !isCountKnownEmpty(COMPARE_COUNT_CHANGED_EVENT);
}
