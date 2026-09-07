// Tracks whether the current page was resolved as logged-in by its own SSR
// pass (see Header.tsx and the admin UserMenu, which set this once on mount
// from the `user` they were rendered with). Lets client.ts's 401 interceptor
// tell apart two very different situations that both surface as a 401:
//
//   1. A guest who was never logged in hits an endpoint that only
//      conditionally requires auth for guests (e.g. WishlistButton's
//      status check, gated by the guestWishlistEnabled Setting) — this 401
//      is expected and already handled locally by that component; the
//      interceptor must NOT also redirect to login for it.
//   2. A page rendered believing the visitor was logged in, then a later
//      client-side request 401s because that session actually died
//      (revoked elsewhere, tokenVersion bump, absolute cap) — this is a
//      genuine session-loss event worth redirecting for.
//
// The distinguishing signal is simply "did this page's own SSR pass
// resolve a user at all", which the interceptor has no way to know on its
// own (the auth cookie is httpOnly — unreadable from this client code).
let knownAuthState = false;

export function setKnownAuthState(loggedIn: boolean): void {
  knownAuthState = loggedIn;
}

export function isKnownAuthState(): boolean {
  return knownAuthState;
}
