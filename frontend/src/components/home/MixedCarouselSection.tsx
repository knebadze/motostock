"use client";

import { Carousel } from "@/components/shared/Carousel";
import { ProductCard } from "@/components/shop/ProductCard";
import { VehicleListingCard } from "@/components/shop/VehicleListingCard";
import type { Product } from "@/lib/api/products";
import type { VehicleListing } from "@/lib/api/vehicle-listings";

type MixedItem =
  | { kind: "product"; key: string; product: Product }
  | { kind: "vehicle"; key: string; listing: VehicleListing };

export function MixedCarouselSection({
  title,
  products,
  listings,
}: {
  title: string;
  products: Product[];
  listings: VehicleListing[];
}) {
  const items: MixedItem[] = [
    ...products.map((product): MixedItem => ({ kind: "product", key: `p${product.id}`, product })),
    ...listings.map((listing): MixedItem => ({ kind: "vehicle", key: `v${listing.id}`, listing })),
  ];

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
              <ProductCard product={item.product} layout="grid" />
            ) : (
              <VehicleListingCard listing={item.listing} layout="grid" />
            )
          }
        />
      </div>
    </section>
  );
}
