"use client";

import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

// Gives up if a navigation never lands (network error, cancelled).
const GIVE_UP_AFTER_MS = 15000;

// Thin bar along the top of the page while a link navigation is loading.
// Public pages have no loading.tsx on purpose — a Suspense fallback there
// would start streaming with 200 before notFound()/permanentRedirect()
// could answer, turning real 404s and 308s into soft ones — so on a slow
// page the old content stays up until the new one arrives, and this bar is
// the "your click was taken" feedback instead.
//
// Started by a same-origin <a> click that changes path or query; cleared
// as soon as the route changes.
export function NavigationProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const routeKey = `${pathname}?${searchParams.toString()}`;
  const [pending, setPending] = useState(false);

  // Route changed (the navigation landed, or back/forward) — reset during
  // render, React's "adjust state when a prop changes" pattern.
  const [lastRouteKey, setLastRouteKey] = useState(routeKey);
  if (lastRouteKey !== routeKey) {
    setLastRouteKey(routeKey);
    setPending(false);
  }

  useEffect(() => {
    let giveUpTimer: ReturnType<typeof setTimeout> | undefined;

    function handleClick(event: MouseEvent) {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = (event.target as Element | null)?.closest?.("a");
      if (!anchor || !anchor.href) return;
      if ((anchor.target && anchor.target !== "_self") || anchor.hasAttribute("download")) return;
      // Links that load in place (list pagination) show their own loading state.
      if (anchor.hasAttribute("data-no-progress")) return;
      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      // Same page (or only the #hash differs) — nothing to load.
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;

      setPending(true);
      clearTimeout(giveUpTimer);
      giveUpTimer = setTimeout(() => setPending(false), GIVE_UP_AFTER_MS);
    }

    // Capture phase: next/link's own click handler calls preventDefault()
    // (it navigates client-side), which would hide the click from a
    // bubbling listener.
    document.addEventListener("click", handleClick, true);
    return () => {
      document.removeEventListener("click", handleClick, true);
      clearTimeout(giveUpTimer);
    };
  }, []);

  if (!pending) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-60 h-0.5" aria-hidden>
      <div className="h-full origin-left animate-nav-progress bg-primary" />
    </div>
  );
}
