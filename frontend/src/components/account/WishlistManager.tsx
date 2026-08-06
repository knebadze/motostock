"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ProductCard } from "@/components/shop/ProductCard";
import { VehicleListingCard } from "@/components/shop/VehicleListingCard";
import type { WishlistItem } from "@/lib/api/wishlist";

export function WishlistManager({ initialItems }: { initialItems: WishlistItem[] }) {
  const t = useTranslations("Account.wishlist");
  const [items, setItems] = useState(initialItems);

  function handleRemoved(itemId: number) {
    setItems((current) => current.filter((item) => item.id !== itemId));
  }

  const productItems = items.filter(
    (item): item is WishlistItem & { product: NonNullable<WishlistItem["product"]> } =>
      item.itemType === "PRODUCT" && item.product != null,
  );
  const vehicleItems = items.filter(
    (
      item,
    ): item is WishlistItem & { vehicleListing: NonNullable<WishlistItem["vehicleListing"]> } =>
      item.itemType === "VEHICLE_LISTING" && item.vehicleListing != null,
  );

  if (items.length === 0) {
    return <p className="mt-6 text-muted-foreground">{t("empty")}</p>;
  }

  return (
    <div className="mt-6 flex flex-col gap-10">
      {productItems.length > 0 && (
        <div>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            {t("productsHeading")}
          </h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {productItems.map((item) => (
              <ProductCard
                key={item.id}
                product={item.product}
                layout="grid"
                wishlistItemId={item.id}
                onWishlistChange={(wishlisted) => {
                  if (!wishlisted) handleRemoved(item.id);
                }}
              />
            ))}
          </div>
        </div>
      )}

      {vehicleItems.length > 0 && (
        <div>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            {t("vehiclesHeading")}
          </h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {vehicleItems.map((item) => (
              <VehicleListingCard
                key={item.id}
                listing={item.vehicleListing}
                layout="grid"
                wishlistItemId={item.id}
                onWishlistChange={(wishlisted) => {
                  if (!wishlisted) handleRemoved(item.id);
                }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
