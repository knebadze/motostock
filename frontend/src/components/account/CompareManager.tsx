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
type Direction = "higherIsBetter" | "lowerIsBetter";

const BETTER_CLASS = "bg-green-500/10 text-green-600";
const WORSE_CLASS = "bg-red-500/10 text-red-600";

// Known vehicle spec rows worth a better/worse call — anything not listed
// here (text/lookup rows like color, condition, fuel type, ...) has no
// meaningful ordering and is left uncolored. Most numeric specs read as
// "more is better"; a short list of true exceptions (heavier, slower to
// charge) is flipped.
const VEHICLE_ROW_DIRECTION: Partial<Record<string, Direction>> = {
  motorPower: "higherIsBetter",
  batteryCapacity: "higherIsBetter",
  range: "higherIsBetter",
  chargingTime: "lowerIsBetter",
  engineVolume: "higherIsBetter",
  enginePower: "higherIsBetter",
  cylinderCount: "higherIsBetter",
  gearCount: "higherIsBetter",
  seatCount: "higherIsBetter",
  weight: "lowerIsBetter",
  fuelTank: "higherIsBetter",
  topSpeed: "higherIsBetter",
  lockingDifferential: "higherIsBetter",
  abs: "higherIsBetter",
};

// Only the strict max and strict min get colored (ties, or every value
// equal, stay neutral) — with more than two columns the values in between
// aren't clearly "best" or "worst", just in between.
function comparisonClasses(values: (number | null)[], direction: Direction): (string | undefined)[] {
  const finite = values.filter((value): value is number => value != null);
  if (finite.length < 2) return values.map(() => undefined);

  const max = Math.max(...finite);
  const min = Math.min(...finite);
  if (max === min) return values.map(() => undefined);

  const better = direction === "higherIsBetter" ? max : min;
  const worse = direction === "higherIsBetter" ? min : max;
  return values.map((value) => {
    if (value == null) return undefined;
    if (value === better) return BETTER_CLASS;
    if (value === worse) return WORSE_CLASS;
    return undefined;
  });
}

function buildProductAttributeRows(products: Product[], locale: Locale) {
  const rows = new Map<number, string>();
  for (const product of products) {
    for (const value of product.attributeValues) {
      if (!rows.has(value.attributeId)) rows.set(value.attributeId, value.attributeName[locale]);
    }
  }
  return Array.from(rows, ([attributeId, label]) => ({ attributeId, label }));
}

// Booleans compare as 1/0 (feature present = better); numbers compare
// as-is. Product attributes are admin-defined and arbitrary, so there's no
// per-attribute "higher/lower is better" metadata to draw on — numeric
// attributes default to "higher is better", the same assumption most
// comparison tables make. Option/text values have no ordering and are left
// uncolored.
function productAttributeRawValue(value: Product["attributeValues"][number] | undefined): number | null {
  if (!value) return null;
  if (value.valueBoolean != null) return value.valueBoolean ? 1 : 0;
  if (value.valueNumber != null) return value.valueNumber;
  return null;
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
                  {(() => {
                    const priceValues = productItems.map((item) =>
                      item.product.activeDiscount
                        ? item.product.activeDiscount.discountPrice
                        : item.product.minPrice,
                    );
                    const priceClasses = comparisonClasses(priceValues, "lowerIsBetter");
                    return productItems.map((item, index) => (
                      <td
                        key={item.id}
                        className={`border-b border-border p-3 text-center font-semibold ${
                          priceClasses[index] ?? "text-primary"
                        }`}
                      >
                        {priceValues[index] != null ? formatPrice(priceValues[index]) : "—"}
                      </td>
                    ));
                  })()}
                </tr>
                {attributeRows.map((row) => {
                  const rawValues = productItems.map((item) =>
                    productAttributeRawValue(
                      item.product.attributeValues.find((av) => av.attributeId === row.attributeId),
                    ),
                  );
                  const classes = comparisonClasses(rawValues, "higherIsBetter");
                  return (
                    <tr key={row.attributeId}>
                      <td className="sticky left-0 z-10 border-b border-border bg-card p-3 text-muted-foreground">
                        {row.label}
                      </td>
                      {productItems.map((item, index) => {
                        const value = item.product.attributeValues.find(
                          (av) => av.attributeId === row.attributeId,
                        );
                        return (
                          <td
                            key={item.id}
                            className={`border-b border-border p-3 text-center ${classes[index] ?? ""}`}
                          >
                            {value ? formatValue(value, locale, tProduct("yes"), tProduct("no")) : "—"}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
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
                  {(() => {
                    const priceValues = vehicleItems.map((item) =>
                      item.vehicleListing.activeDiscount
                        ? item.vehicleListing.activeDiscount.discountPrice
                        : item.vehicleListing.price,
                    );
                    const priceClasses = comparisonClasses(priceValues, "lowerIsBetter");
                    return vehicleItems.map((item, index) => (
                      <td
                        key={item.id}
                        className={`border-b border-border p-3 text-center font-semibold ${
                          priceClasses[index] ?? "text-primary"
                        }`}
                      >
                        {formatPrice(priceValues[index])}
                      </td>
                    ));
                  })()}
                </tr>
                {Array.from(vehicleRowDefs, ([key, label]) => ({ key, label })).map((row) => {
                  const direction = VEHICLE_ROW_DIRECTION[row.key];
                  const rawValues = vehicleRowsPerListing.map(
                    (rows) => rows.find((r) => r.key === row.key)?.raw ?? null,
                  );
                  const classes = direction
                    ? comparisonClasses(rawValues, direction)
                    : rawValues.map(() => undefined);
                  return (
                    <tr key={row.key}>
                      <td className="sticky left-0 z-10 border-b border-border bg-card p-3 text-muted-foreground">
                        {row.label}
                      </td>
                      {vehicleRowsPerListing.map((rows, index) => {
                        const value = rows.find((r) => r.key === row.key)?.value;
                        return (
                          <td
                            key={vehicleItems[index].id}
                            className={`border-b border-border p-3 text-center ${classes[index] ?? ""}`}
                          >
                            {value ?? "—"}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
