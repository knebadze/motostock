"use client";

import { useEffect, useState } from "react";
import { getUsdToGelRate } from "./api/vehicle-listings";

// Module-level deduped promise — every VehicleListingCard/detail page that
// mounts on the same page load shares this one fetch instead of each firing
// its own request. Deliberately not threaded as a prop through the 5+
// parent components that render these cards (shop grid, homepage carousels,
// wishlist, similar-listings) — this hook fetches lazily and independently
// wherever it's used.
let ratePromise: Promise<number | null> | null = null;

function loadRate(): Promise<number | null> {
  if (!ratePromise) {
    ratePromise = getUsdToGelRate()
      .then((result) => result.rate)
      .catch(() => null);
  }
  return ratePromise;
}

export function useUsdToGelRate(): { rate: number | null; loading: boolean } {
  const [rate, setRate] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    loadRate().then((value) => {
      if (!cancelled) {
        setRate(value);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return { rate, loading };
}
