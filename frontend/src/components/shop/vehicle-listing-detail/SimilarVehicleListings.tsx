"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { Carousel } from "@/components/shared/Carousel";
import { VehicleListingCard } from "../VehicleListingCard";
import { getWishlistStatus } from "@/lib/api/wishlist";
import { getCompareStatus } from "@/lib/api/compare";
import { isKnownAuthState } from "@/lib/api/auth-state";
import { isGuestWishlistKnownEnabled } from "@/lib/api/guest-feature-state";
import { useCollectionStatusMap, lookupVehicleListingStatus } from "@/components/shared/useCollectionStatusMap";
import type { VehicleListing } from "@/lib/api/vehicle-listings";

export function SimilarVehicleListings({ listings }: { listings: VehicleListing[] }) {
  const t = useTranslations("VehicleListingDetail");

  // One batched wishlist/compare status check for the whole carousel instead
  // of each VehicleListingCard's own WishlistButton/CompareButton checking
  // individually — see useCollectionStatusMap's own comment.
  const listingIds = useMemo(() => listings.map((listing) => listing.id), [listings]);
  const wishlistStatus = useCollectionStatusMap(
    getWishlistStatus,
    [],
    listingIds,
    () => isKnownAuthState() || isGuestWishlistKnownEnabled(),
  );
  const compareStatus = useCollectionStatusMap(getCompareStatus, [], listingIds, () => true);

  if (listings.length === 0) return null;

  return (
    <section className="mt-14 border-t border-border pt-8">
      <h2 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
        {t("similarHeading")}
      </h2>
      <div className="mt-6">
        <Carousel
          items={listings}
          getKey={(listing) => listing.id}
          renderItem={(listing) => (
            <VehicleListingCard
              listing={listing}
              layout="grid"
              wishlistItemId={lookupVehicleListingStatus(wishlistStatus, listing.id)}
              compareItemId={lookupVehicleListingStatus(compareStatus, listing.id)}
            />
          )}
        />
      </div>
    </section>
  );
}
