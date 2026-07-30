"use client";

import { useLocale, useTranslations } from "next-intl";
import { resolveMediaUrl } from "@/lib/api/client";
import { formatPrice, pickLookupName } from "@/lib/format";
import type { VehicleListing } from "@/lib/api/vehicle-listings";
import type { ViewMode } from "./ViewModeToggle";

export function VehicleListingCard({
  listing,
  layout,
}: {
  listing: VehicleListing;
  layout: ViewMode;
}) {
  const locale = useLocale() as "ka" | "en" | "ru";
  const t = useTranslations("Shop");
  const imageUrl = resolveMediaUrl(listing.vehicleCatalog.imageUrl);
  const outOfStock = listing.stockQuantity === 0;
  const { activeDiscount } = listing;

  return (
    <div
      className={`h-full rounded-2xl border border-border bg-card p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary hover:shadow-lg ${
        layout === "list" ? "flex items-center gap-4" : "flex flex-col gap-3"
      }`}
    >
      <div
        className={
          layout === "list"
            ? "relative size-24 shrink-0 overflow-hidden rounded-xl bg-muted"
            : "relative aspect-square w-full overflow-hidden rounded-xl bg-muted"
        }
      >
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt={listing.vehicleCatalog.model.name[locale]}
            className="size-full object-cover"
          />
        ) : (
          <div className="size-full border border-dashed border-border" />
        )}
        {outOfStock && (
          <span className="absolute left-1.5 top-1.5 rounded-full bg-foreground/80 px-2 py-0.5 text-xs font-semibold text-background shadow-sm">
            {t("outOfStock")}
          </span>
        )}
        {activeDiscount && (
          <span className="absolute right-1.5 top-1.5 rounded-full bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground shadow-sm">
            {t("discountBadge")}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col justify-between gap-1">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {listing.vehicleCatalog.brand.name[locale]} · {listing.year}
          </span>
          <span className="line-clamp-2 min-h-12 font-semibold text-foreground">
            {listing.vehicleCatalog.model.name[locale]}
          </span>
          <div className="flex flex-wrap gap-1.5 text-xs text-muted-foreground">
            <span className="rounded-full border border-border px-2 py-0.5">
              {pickLookupName(listing.condition, locale)}
            </span>
            <span className="rounded-full border border-border px-2 py-0.5">
              {pickLookupName(listing.color, locale)}
            </span>
          </div>
        </div>
        {activeDiscount ? (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground line-through">
              {formatPrice(listing.price)}
            </span>
            <span className="text-lg font-bold text-primary">
              {formatPrice(activeDiscount.discountPrice)}
            </span>
          </div>
        ) : (
          <span className="text-lg font-bold text-primary">{formatPrice(listing.price)}</span>
        )}
      </div>
    </div>
  );
}
