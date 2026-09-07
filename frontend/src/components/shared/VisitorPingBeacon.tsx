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
  useEffect(() => {
    pingVisitor().catch(() => {});
    const timer = setInterval(() => {
      pingVisitor().catch(() => {});
    }, PING_INTERVAL_MS);
    return () => clearInterval(timer);
  }, []);

  return null;
}
