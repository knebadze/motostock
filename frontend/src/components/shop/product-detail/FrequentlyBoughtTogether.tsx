"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { Carousel } from "@/components/shared/Carousel";
import { ProductCard } from "../ProductCard";
import { getWishlistStatus } from "@/lib/api/wishlist";
import { getCompareStatus } from "@/lib/api/compare";
import { isKnownAuthState } from "@/lib/api/auth-state";
import { isGuestWishlistKnownEnabled } from "@/lib/api/guest-feature-state";
import { useCollectionStatusMap, lookupProductStatus } from "@/components/shared/useCollectionStatusMap";
import type { ProductListItem } from "@/lib/api/products";

// Algorithmic (co-purchase-count-based) companion list — a plain browsing
// carousel, unlike BuyTogether's "add the whole bundle" widget, since a
// statistical co-occurrence signal is weaker than an admin's deliberate
// pairing and shouldn't be presented as a ready-made bundle. Only ever
// rendered as a fallback when the admin hasn't curated a buyTogether list
// for this product (see the item detail page).
export function FrequentlyBoughtTogether({ products }: { products: ProductListItem[] }) {
  const t = useTranslations("ProductDetail");

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
    <section className="mt-14 border-t border-border pt-8">
      <h2 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
        {t("frequentlyBoughtTogetherHeading")}
      </h2>
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
