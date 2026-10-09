"use client";

import { useEffect } from "react";
import { pingVisitor } from "@/lib/api/visitors";

// 2 minutes — comfortably under the backend's 5-minute "active now" window
// (see backend's visitors.service.ts ACTIVE_WINDOW_MS), so a tab left open
// never drops out of "active" between pings.
const PING_INTERVAL_MS = 2 * 60 * 1000;

// Mounted once in the storefront's root layout (not the admin layout — an
// admin working the panel isn't a storefront "visitor"). Silent by design:
// a failed ping (network hiccup, ad blocker) just means this one heartbeat
// is missed, nothing user-facing depends on it succeeding.
export function VisitorPingBeacon() {
  // Only while the tab is visible — a page left open in a background tab
  // isn't someone "active" on the site — plus a ping the moment it's shown
  // again.
  useEffect(() => {
    pingVisitor().catch(() => {});
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") pingVisitor().catch(() => {});
    }, PING_INTERVAL_MS);
    function handleVisibilityChange() {
      if (document.visibilityState === "visible") pingVisitor().catch(() => {});
    }
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  return null;
}
