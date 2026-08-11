"use client";

import { useState } from "react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { resolveMediaUrl } from "@/lib/api/client";
import { formatPrice } from "@/lib/format";
import { removeFromCompare, type CompareItem } from "@/lib/api/compare";
import { formatValue } from "@/components/shop/product-detail/ProductSpecs";
import { buildVehicleSpecRows } from "@/components/shop/vehicle-listing-detail/VehicleSpecs";
import type { Product } from "@/lib/api/products";
import type { VehicleListing } from "@/lib/api/vehicle-listings";

type Locale = "ka" | "en" | "ru";

function buildProductAttributeRows(products: Product[], locale: Locale) {
  const rows = new Map<number, string>();
  for (const product of products) {
    for (const value of product.attributeValues) {
      if (!rows.has(value.attributeId)) rows.set(value.attributeId, value.attributeName[locale]);
    }
  }
  return Array.from(rows, ([attributeId, label]) => ({ attributeId, label }));
}

export function CompareManager({ initialItems }: { initialItems: CompareItem[] }) {
  const t = useTranslations("Account.compare");
  const tProduct = useTranslations("ProductDetail");
  const tVehicle = useTranslations("VehicleListingDetail");
  const locale = useLocale() as Locale;
  const [items, setItems] = useState(initialItems);

  async function handleRemove(id: number) {
    setItems((current) => current.filter((item) => item.id !== id));
    try {
      await removeFromCompare(id);
    } catch {
      // The item is already gone from the visible list — a failed DELETE
      // just leaves a stale row server-side, harmless and self-corrects on
      // the next add/remove of the same item.
    }
  }

  const productItems = items.filter(
    (item): item is CompareItem & { product: Product } =>
      item.itemType === "PRODUCT" && item.product != null,
  );
  const vehicleItems = items.filter(
    (item): item is CompareItem & { vehicleListing: VehicleListing } =>
      item.itemType === "VEHICLE_LISTING" && item.vehicleListing != null,
  );

  if (items.length === 0) {
    return <p className="mt-6 text-muted-foreground">{t("empty")}</p>;
  }

  const attributeRows = buildProductAttributeRows(
    productItems.map((item) => item.product),
    locale,
  );

  const vehicleRowsPerListing = vehicleItems.map((item) =>
    buildVehicleSpecRows(item.vehicleListing, locale, tVehicle),
  );
  const vehicleRowDefs = new Map<string, string>();
  vehicleRowsPerListing.forEach((rows) => {
    rows.forEach((row) => {
      if (!vehicleRowDefs.has(row.key)) vehicleRowDefs.set(row.key, row.label);
    });
  });

  return (
    <div className="mt-6 flex flex-col gap-10">
      {productItems.length > 0 && (
        <div>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            {t("productsHeading")}
          </h2>
          <div className="overflow-x-auto rounded-2xl border border-border">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr>
                  <th className="sticky left-0 z-10 min-w-32 border-b border-border bg-card p-3 text-left align-bottom" />
                  {productItems.map((item) => {
                    const imageUrl = resolveMediaUrl(item.product.imageUrl);
                    return (
                      <th
                        key={item.id}
                        className="min-w-48 border-b border-border bg-card p-3 align-bottom font-normal"
                      >
                        <div className="flex flex-col items-center gap-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemove(item.id)}
                            aria-label={t("removeLabel")}
                            className="self-end text-muted-foreground transition-colors hover:text-primary"
                          >
                            ✕
                          </button>
                          <Link
                            href={`/${item.product.category.slug}/${item.product.slug}`}
                            className="flex flex-col items-center gap-2"
                          >
                            <div className="relative size-20 overflow-hidden rounded-xl bg-muted">
                              {imageUrl ? (
                                <Image
                                  src={imageUrl}
                                  alt={item.product.name[locale]}
                                  fill
                                  sizes="80px"
                                  className="object-cover"
                                />
                              ) : (
                                <div className="size-full border border-dashed border-border" />
                              )}
                            </div>
                            <span className="line-clamp-2 font-semibold text-foreground">
                              {item.product.name[locale]}
                            </span>
                          </Link>
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="sticky left-0 z-10 border-b border-border bg-card p-3 text-muted-foreground">
                    {t("priceLabel")}
                  </td>
                  {productItems.map((item) => (
                    <td key={item.id} className="border-b border-border p-3 text-center font-semibold text-primary">
                      {item.product.activeDiscount
                        ? formatPrice(item.product.activeDiscount.discountPrice)
                        : item.product.minPrice != null
                          ? formatPrice(item.product.minPrice)
                          : "—"}
                    </td>
                  ))}
                </tr>
                {attributeRows.map((row) => (
                  <tr key={row.attributeId}>
                    <td className="sticky left-0 z-10 border-b border-border bg-card p-3 text-muted-foreground">
                      {row.label}
                    </td>
                    {productItems.map((item) => {
                      const value = item.product.attributeValues.find(
                        (av) => av.attributeId === row.attributeId,
                      );
                      return (
                        <td key={item.id} className="border-b border-border p-3 text-center">
                          {value ? formatValue(value, locale, tProduct("yes"), tProduct("no")) : "—"}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {vehicleItems.length > 0 && (
        <div>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            {t("vehiclesHeading")}
          </h2>
          <div className="overflow-x-auto rounded-2xl border border-border">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr>
                  <th className="sticky left-0 z-10 min-w-32 border-b border-border bg-card p-3 text-left align-bottom" />
                  {vehicleItems.map((item) => {
                    const listing = item.vehicleListing;
                    const imageUrl = resolveMediaUrl(
                      listing.images[0]?.imageUrl ?? listing.vehicleCatalog.imageUrl,
                    );
                    return (
                      <th
                        key={item.id}
                        className="min-w-48 border-b border-border bg-card p-3 align-bottom font-normal"
                      >
                        <div className="flex flex-col items-center gap-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemove(item.id)}
                            aria-label={t("removeLabel")}
                            className="self-end text-muted-foreground transition-colors hover:text-primary"
                          >
                            ✕
                          </button>
                          <Link
                            href={`/${listing.vehicleCatalog.category.slug}/${listing.id}`}
                            className="flex flex-col items-center gap-2"
                          >
                            <div className="relative size-20 overflow-hidden rounded-xl bg-muted">
                              {imageUrl ? (
                                <Image
                                  src={imageUrl}
                                  alt={listing.vehicleCatalog.model.name[locale]}
                                  fill
                                  sizes="80px"
                                  className="object-cover"
                                />
                              ) : (
                                <div className="size-full border border-dashed border-border" />
                              )}
                            </div>
                            <span className="line-clamp-2 font-semibold text-foreground">
                              {listing.vehicleCatalog.brand.name[locale]}{" "}
                              {listing.vehicleCatalog.model.name[locale]}
                            </span>
                          </Link>
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="sticky left-0 z-10 border-b border-border bg-card p-3 text-muted-foreground">
                    {t("priceLabel")}
                  </td>
                  {vehicleItems.map((item) => (
                    <td key={item.id} className="border-b border-border p-3 text-center font-semibold text-primary">
                      {item.vehicleListing.activeDiscount
                        ? formatPrice(item.vehicleListing.activeDiscount.discountPrice)
                        : formatPrice(item.vehicleListing.price)}
                    </td>
                  ))}
                </tr>
                {Array.from(vehicleRowDefs, ([key, label]) => ({ key, label })).map((row) => (
                  <tr key={row.key}>
                    <td className="sticky left-0 z-10 border-b border-border bg-card p-3 text-muted-foreground">
                      {row.label}
                    </td>
                    {vehicleRowsPerListing.map((rows, index) => {
                      const value = rows.find((r) => r.key === row.key)?.value;
                      return (
                        <td key={vehicleItems[index].id} className="border-b border-border p-3 text-center">
                          {value ?? "—"}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
