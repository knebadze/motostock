"use client";

import { useMemo } from "react";
import { Carousel, CAROUSEL_CARD_IMAGE_SIZES } from "@/components/shared/Carousel";
import { VehicleListingCard } from "@/components/shop/VehicleListingCard";
import { getWishlistStatus } from "@/lib/api/wishlist";
import { getCompareStatus } from "@/lib/api/compare";
import { shouldCheckWishlistStatus, shouldCheckCompareStatus } from "@/lib/api/collection-status-gate";
import { useCollectionStatusMap, lookupVehicleListingStatus } from "@/components/shared/useCollectionStatusMap";
import type { VehicleListing } from "@/lib/api/vehicle-listings";

export function VehicleListingsCarouselSection({
  title,
  listings,
}: {
  title: string;
  listings: VehicleListing[];
}) {
  // One batched wishlist/compare status check for the whole carousel instead
  // of each VehicleListingCard's own WishlistButton/CompareButton checking
  // individually — see useCollectionStatusMap's own comment.
  const listingIds = useMemo(() => listings.map((listing) => listing.id), [listings]);
  const wishlistStatus = useCollectionStatusMap(
    getWishlistStatus,
    [],
    listingIds,
    shouldCheckWishlistStatus,
  );
  const compareStatus = useCollectionStatusMap(getCompareStatus, [], listingIds, shouldCheckCompareStatus);

  if (listings.length === 0) return null;

  return (
    <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
      <div className="mt-6">
        <Carousel
          items={listings}
          getKey={(listing) => listing.id}
          renderItem={(listing) => (
            <VehicleListingCard
              listing={listing}
              layout="grid"
              imageSizes={CAROUSEL_CARD_IMAGE_SIZES}
              wishlistItemId={lookupVehicleListingStatus(wishlistStatus, listing.id)}
              compareItemId={lookupVehicleListingStatus(compareStatus, listing.id)}
            />
          )}
        />
      </div>
    </section>
  );
}
