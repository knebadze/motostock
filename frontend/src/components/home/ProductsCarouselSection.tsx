"use client";

import { useMemo } from "react";
import { Carousel } from "@/components/shared/Carousel";
import { ProductCard } from "@/components/shop/ProductCard";
import { getWishlistStatus } from "@/lib/api/wishlist";
import { getCompareStatus } from "@/lib/api/compare";
import { isKnownAuthState } from "@/lib/api/auth-state";
import { isGuestWishlistKnownEnabled } from "@/lib/api/guest-feature-state";
import { useCollectionStatusMap, lookupProductStatus } from "@/components/shared/useCollectionStatusMap";
import type { ProductListItem } from "@/lib/api/products";

export function ProductsCarouselSection({
  title,
  products,
}: {
  title: string;
  products: ProductListItem[];
}) {
  // One batched wishlist/compare status check for the whole carousel instead
  // of each ProductCard's own WishlistButton/CompareButton checking
  // individually — see useCollectionStatusMap's own comment.
  const productIds = useMemo(() => products.map((product) => product.id), [products]);
  const wishlistStatus = useCollectionStatusMap(
    getWishlistStatus,
    productIds,
    [],
    () => isKnownAuthState() || isGuestWishlistKnownEnabled(),
  );
  const compareStatus = useCollectionStatusMap(getCompareStatus, productIds, [], () => true);

  if (products.length === 0) return null;

  return (
    <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
      <div className="mt-6">
        <Carousel
          items={products}
          getKey={(product) => product.id}
          renderItem={(product) => (
            <ProductCard
              product={product}
              layout="grid"
              wishlistItemId={lookupProductStatus(wishlistStatus, product.id)}
              compareItemId={lookupProductStatus(compareStatus, product.id)}
            />
          )}
        />
      </div>
    </section>
  );
}
