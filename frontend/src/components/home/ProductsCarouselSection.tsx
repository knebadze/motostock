"use client";

import { Carousel } from "@/components/shared/Carousel";
import { ProductCard } from "@/components/shop/ProductCard";
import type { Product } from "@/lib/api/products";

export function ProductsCarouselSection({
  title,
  products,
}: {
  title: string;
  products: Product[];
}) {
  if (products.length === 0) return null;

  return (
    <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
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
