"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { Carousel, CAROUSEL_CARD_IMAGE_SIZES } from "@/components/shared/Carousel";
import { ProductCard } from "../ProductCard";
import { getWishlistStatus } from "@/lib/api/wishlist";
import { getCompareStatus } from "@/lib/api/compare";
import { shouldCheckWishlistStatus, shouldCheckCompareStatus } from "@/lib/api/collection-status-gate";
import { useCollectionStatusMap, lookupProductStatus } from "@/components/shared/useCollectionStatusMap";
import type { ProductListItem } from "@/lib/api/products";

export function SimilarProducts({ products }: { products: ProductListItem[] }) {
  const t = useTranslations("ProductDetail");

  // One batched wishlist/compare status check for the whole carousel instead
  // of each ProductCard's own WishlistButton/CompareButton checking
  // individually — see useCollectionStatusMap's own comment.
  const productIds = useMemo(() => products.map((product) => product.id), [products]);
  const wishlistStatus = useCollectionStatusMap(
    getWishlistStatus,
    productIds,
    [],
    shouldCheckWishlistStatus,
  );
  const compareStatus = useCollectionStatusMap(getCompareStatus, productIds, [], shouldCheckCompareStatus);

  if (products.length === 0) return null;

  return (
    <section className="mt-14 border-t border-border pt-8">
      <h2 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
        {t("similarProductsHeading")}
      </h2>
      <div className="mt-6">
        <Carousel
          items={products}
          getKey={(product) => product.id}
          renderItem={(product) => (
            <ProductCard
              product={product}
              layout="grid"
              imageSizes={CAROUSEL_CARD_IMAGE_SIZES}
              wishlistItemId={lookupProductStatus(wishlistStatus, product.id)}
              compareItemId={lookupProductStatus(compareStatus, product.id)}
            />
          )}
        />
      </div>
    </section>
  );
}
