"use client";

import { useTranslations } from "next-intl";
import { Carousel } from "@/components/shared/Carousel";
import { ProductCard } from "../ProductCard";
import type { Product } from "@/lib/api/products";

// View-based co-occurrence ("customers who viewed this also viewed") —
// independent of both BuyTogether (admin-curated) and
// FrequentlyBoughtTogether (order co-occurrence); views vastly outnumber
// orders, so this stays useful even while order history is still thin.
export function ViewedTogether({ products }: { products: Product[] }) {
  const t = useTranslations("ProductDetail");

  if (products.length === 0) return null;

  return (
    <section className="mt-14 border-t border-border pt-8">
      <h2 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
        {t("viewedTogetherHeading")}
      </h2>
      <div className="mt-6">
        <Carousel
          items={products}
          getKey={(product) => product.id}
          renderItem={(product) => <ProductCard product={product} layout="grid" />}
        />
      </div>
    </section>
  );
}
