"use client";

import { useEffect, useState } from "react";
import type { CollectionStatus } from "@/lib/api/collection-api";

// itemId (a product's or vehicle-listing's own id) -> that collection row's
// id, or null when the item isn't in the collection at all. Products and
// vehicle listings are separate tables with independent id sequences, so a
// single shared map keyed by plain number would risk collisions (a product
// and an unrelated vehicle listing can easily share the same numeric id) —
// callers get one map per item type instead (see CollectionStatusResult).
export type CollectionStatusMap = Map<number, number | null>;

export type CollectionStatusResult = {
  productStatus: CollectionStatusMap;
  vehicleListingStatus: CollectionStatusMap;
};

const EMPTY_RESULT: CollectionStatusResult = { productStatus: new Map(), vehicleListingStatus: new Map() };

// Batches ONE wishlist/compare status-check call for every product/vehicle-
// listing id a grid renders, instead of leaving each card's own
// WishlistButton/CompareButton to check its own status individually (see
// those components' own "fetched lazily per button... worth batching later"
// comments) — a 20-card grid otherwise fires 20 parallel client requests
// right after hydration, competing with the page's own images for
// bandwidth, worst on mobile. Returns "pending" until the batch resolves;
// WishlistButton/CompareButton treat that as "a parent owns this lookup,
// don't fetch individually, wait for the real answer" (see their own
// initialWishlistItemId/initialCompareItemId handling).
export function useCollectionStatusMap(
  getStatus: (productIds: number[], vehicleListingIds: number[]) => Promise<CollectionStatus>,
  productIds: number[],
  vehicleListingIds: number[],
  // Same "don't even try for a guest who can only ever 401" short-circuit
  // each button already applies individually — parameterized since wishlist
  // gates on a Settings flag for guests and compare doesn't (see
  // CompareButton's own comment: guests are always allowed there).
  shouldAttempt: () => boolean,
): CollectionStatusResult | "pending" {
  const [status, setStatus] = useState<CollectionStatusResult | "pending">("pending");
  // Arrays built inline by callers (e.g. `products.map((p) => p.id)`) are a
  // new reference every render — a stable string key is what the effect
  // below actually keys its re-fetch on.
  const key = `${productIds.join(",")}|${vehicleListingIds.join(",")}`;

  useEffect(() => {
    // Both branches below resolve synchronously (no ids to check, or a
    // guest who can never succeed here) — same established
    // set-state-in-effect pattern as ThemeToggle.tsx's mount-sync effect,
    // just resolving immediately instead of after a real async fetch.
    if (productIds.length === 0 && vehicleListingIds.length === 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStatus(EMPTY_RESULT);
      return;
    }
    if (!shouldAttempt()) {
      setStatus(EMPTY_RESULT);
      return;
    }
    let cancelled = false;

    getStatus(productIds, vehicleListingIds)
      .then((result) => {
        if (cancelled) return;
        const productStatus: CollectionStatusMap = new Map();
        const vehicleListingStatus: CollectionStatusMap = new Map();
        for (const item of result.items) {
          if (item.productId != null) productStatus.set(item.productId, item.id);
          else if (item.vehicleListingId != null) vehicleListingStatus.set(item.vehicleListingId, item.id);
        }
        setStatus({ productStatus, vehicleListingStatus });
      })
      .catch(() => {
        // Same as each button's own individual catch — a failed lookup just
        // leaves every card starting unwishlisted/uncompared rather than
        // surfacing an error for a passive background check.
        if (!cancelled) setStatus(EMPTY_RESULT);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return status;
}

// Reads one product's status out of the batch result, preserving the
// "pending" sentinel — pass the result straight through to WishlistButton's/
// CompareButton's initial*ItemId prop.
export function lookupProductStatus(
  status: CollectionStatusResult | "pending",
  productId: number,
): number | null | "pending" {
  if (status === "pending") return "pending";
  return status.productStatus.get(productId) ?? null;
}

// Same as lookupProductStatus, for a vehicle listing's id.
export function lookupVehicleListingStatus(
  status: CollectionStatusResult | "pending",
  vehicleListingId: number,
): number | null | "pending" {
  if (status === "pending") return "pending";
  return status.vehicleListingStatus.get(vehicleListingId) ?? null;
}
