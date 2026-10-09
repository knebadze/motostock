"use client";

import { useMemo } from "react";
import { Carousel, CAROUSEL_CARD_IMAGE_SIZES } from "@/components/shared/Carousel";
import { ProductCard } from "@/components/shop/ProductCard";
import { VehicleListingCard } from "@/components/shop/VehicleListingCard";
import { getWishlistStatus } from "@/lib/api/wishlist";
import { getCompareStatus } from "@/lib/api/compare";
import { shouldCheckWishlistStatus, shouldCheckCompareStatus } from "@/lib/api/collection-status-gate";
import {
  useCollectionStatusMap,
  lookupProductStatus,
  lookupVehicleListingStatus,
} from "@/components/shared/useCollectionStatusMap";
import type { ProductListItem } from "@/lib/api/products";
import type { VehicleListing } from "@/lib/api/vehicle-listings";

type MixedItem =
  | { kind: "product"; key: string; product: ProductListItem }
  | { kind: "vehicle"; key: string; listing: VehicleListing };

export function MixedCarouselSection({
  title,
  products,
  listings,
}: {
  title: string;
  products: ProductListItem[];
  listings: VehicleListing[];
}) {
  const items: MixedItem[] = [
    ...products.map((product): MixedItem => ({ kind: "product", key: `p${product.id}`, product })),
    ...listings.map((listing): MixedItem => ({ kind: "vehicle", key: `v${listing.id}`, listing })),
  ];

  // One batched wishlist/compare call covering BOTH products and listings at
  // once (getWishlistStatus/getCompareStatus already accept both id arrays
  // together) instead of each card's own button checking individually.
  const productIds = useMemo(() => products.map((product) => product.id), [products]);
  const listingIds = useMemo(() => listings.map((listing) => listing.id), [listings]);
  const wishlistStatus = useCollectionStatusMap(
    getWishlistStatus,
    productIds,
    listingIds,
    shouldCheckWishlistStatus,
  );
  const compareStatus = useCollectionStatusMap(getCompareStatus, productIds, listingIds, shouldCheckCompareStatus);

  if (items.length === 0) return null;

  return (
    <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
      <div className="mt-6">
        <Carousel
          items={items}
          getKey={(item) => item.key}
          renderItem={(item) =>
            item.kind === "product" ? (
              <ProductCard
                product={item.product}
                layout="grid"
                imageSizes={CAROUSEL_CARD_IMAGE_SIZES}
                wishlistItemId={lookupProductStatus(wishlistStatus, item.product.id)}
                compareItemId={lookupProductStatus(compareStatus, item.product.id)}
              />
            ) : (
              <VehicleListingCard
                listing={item.listing}
                layout="grid"
                imageSizes={CAROUSEL_CARD_IMAGE_SIZES}
                wishlistItemId={lookupVehicleListingStatus(wishlistStatus, item.listing.id)}
                compareItemId={lookupVehicleListingStatus(compareStatus, item.listing.id)}
              />
            )
          }
        />
      </div>
    </section>
  );
}
