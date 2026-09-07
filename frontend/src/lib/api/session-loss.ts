// Tiny pub-sub, not an event target — realistically only one subscriber is
// ever alive at a time (whichever layout is currently mounted in this
// browser tab), so a settable callback is enough.
//
// client.ts's axios response interceptor runs outside any React
// render/event-handler context, so it has no router instance of its own to
// navigate with. SessionLossRedirector.tsx (mounted once in RootShell,
// covering both the admin and customer trees) registers a real router.push
// here on mount, letting a 401-triggered redirect (see client.ts's
// redirectToLoginOnSessionLoss) be a normal SPA navigation instead of a
// hard window.location reload.
type SessionLossHandler = (loginUrl: string) => void;

let handler: SessionLossHandler | null = null;

export function registerSessionLossHandler(next: SessionLossHandler | null): void {
  handler = next;
}

// Falls back to a hard reload if nothing has registered yet (e.g. a 401
// arrives before SessionLossRedirector's effect has run) — losing the SPA
// navigation in that rare window is a fine tradeoff against silently doing
// nothing.
export function notifySessionLoss(loginUrl: string): void {
  if (handler) {
    handler(loginUrl);
  } else if (typeof window !== "undefined") {
    window.location.href = loginUrl;
  }
}
