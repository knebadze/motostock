// Same "this page's own SSR pass told us" pattern as auth-state.ts's
// knownAuthState — Header.tsx sets this once on mount from the
// GuestFeatureStatus it was rendered with (see (guest)/layout.tsx), so
// WishlistButton/AddToCartButton can decide whether to even attempt their
// per-item "is this already saved?" status check for a logged-out visitor,
// instead of always firing it and relying on the resulting 401 (see
// resolveWishlistOwner/resolveCartOwner on the backend).
let guestWishlistEnabled = false;
let guestCartEnabled = false;

export function setKnownGuestFeatureStatus(status: { guestWishlistEnabled: boolean; guestCartEnabled: boolean }): void {
  guestWishlistEnabled = status.guestWishlistEnabled;
  guestCartEnabled = status.guestCartEnabled;
}

export function isGuestWishlistKnownEnabled(): boolean {
  return guestWishlistEnabled;
}

export function isGuestCartKnownEnabled(): boolean {
  return guestCartEnabled;
}
