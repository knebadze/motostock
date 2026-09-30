"use client";

import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { resolveMediaUrl } from "@/lib/api/client";
import { formatPrice, pickLookupName } from "@/lib/format";
import { useVehiclePriceDisplay } from "@/lib/useVehiclePriceDisplay";
import { WishlistButton } from "@/components/shared/WishlistButton";
import { CompareButton } from "@/components/shared/CompareButton";
import { CurrencyToggleButton } from "./CurrencyToggleButton";
import { buildVehicleListingSlug, type VehicleListing } from "@/lib/api/vehicle-listings";
import type { ViewMode } from "./ViewModeToggle";

export function VehicleListingCard({
  listing,
  layout,
  wishlistItemId,
  onWishlistChange,
  compareItemId,
  onCompareChange,
}: {
  listing: VehicleListing;
  layout: ViewMode;
  // Passed by WishlistManager (every card there is wishlisted by
  // definition) or by a grid using useCollectionStatusMap to batch the
  // lookup across every card at once — see WishlistButton's own prop
  // comment for what each possible value means.
  wishlistItemId?: number | null | "pending";
  onWishlistChange?: (wishlisted: boolean) => void;
  // Same idea as wishlistItemId/onWishlistChange, passed by CompareManager
  // or a batching grid.
  compareItemId?: number | null | "pending";
  onCompareChange?: (compared: boolean) => void;
}) {
  const locale = useLocale() as "ka" | "en" | "ru";
  const t = useTranslations("Shop");
  // The listing's own photo (what's actually for sale) takes priority over
  // the catalog's generic reference image.
  const imageUrl = resolveMediaUrl(listing.images[0]?.imageUrl ?? listing.vehicleCatalog.imageUrl);
  const outOfStock = listing.stockQuantity === 0;
  const { activeDiscount } = listing;
  const priceDisplay = useVehiclePriceDisplay(listing.priceCurrency);
  // Brand + model, not model alone — matches the detail page's JSON-LD and
  // gives image search / screen readers the full identifying label.
  const vehicleLabel = `${listing.vehicleCatalog.brand.name} ${listing.vehicleCatalog.model.name}`;

  return (
    // Not a <Link> itself — see ProductCard.tsx's matching comment. Same
    // "stretched link" pattern: an absolutely-positioned, content-less Link
    // sits as a sibling to the visible content instead of wrapping it, so
    // WishlistButton/CompareButton's real <button>s are never nested inside
    // an <a> (invalid HTML — interactive content inside interactive
    // content).
    <div
      className={`group relative h-full rounded-2xl border border-border bg-card p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary hover:shadow-lg ${
        layout === "list" ? "flex items-center gap-4" : "flex flex-col gap-3"
      }`}
    >
      <Link
        href={`/${listing.vehicleCatalog.category.slug}/${buildVehicleListingSlug(listing)}`}
        aria-label={vehicleLabel}
        className="absolute inset-0"
      />
      <div
        className={`pointer-events-none ${
          layout === "list"
            ? "relative size-24 shrink-0 overflow-hidden rounded-xl bg-muted"
            : "relative aspect-square w-full overflow-hidden rounded-xl bg-muted"
        }`}
      >
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={vehicleLabel}
            fill
            sizes={layout === "list" ? "96px" : "(min-width: 1024px) 22vw, (min-width: 640px) 45vw, 90vw"}
            className="object-cover"
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
        <WishlistButton
          itemType="VEHICLE_LISTING"
          id={listing.id}
          initialWishlistItemId={wishlistItemId}
          onChange={onWishlistChange}
          labelSave={t("wishlistSaveLabel")}
          labelSaved={t("wishlistSavedLabel")}
          className="pointer-events-auto absolute bottom-1.5 right-1.5"
        />
        <CompareButton
          itemType="VEHICLE_LISTING"
          id={listing.id}
          initialCompareItemId={compareItemId}
          onChange={onCompareChange}
          labelAdd={t("compareAddLabel")}
          labelAdded={t("compareAddedLabel")}
          className="pointer-events-auto absolute bottom-1.5 left-1.5"
        />
      </div>

      <div className="pointer-events-none flex flex-1 flex-col justify-between gap-1">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {listing.vehicleCatalog.brand.name} · {listing.year}
          </span>
          <span className="line-clamp-2 min-h-12 font-semibold text-foreground">
            {listing.vehicleCatalog.model.name}
          </span>
          <div className="flex flex-wrap gap-1.5 text-xs text-muted-foreground">
            {listing.isCustomsCleared ? (
              // text-*-600 measured at ~3.2-3.3:1 against this badge's own
              // tinted background in light mode — short of the 4.5:1 AA
              // minimum. -800 gives a comfortable light-mode margin (~6.5:1),
              // but is nearly invisible in dark mode (~1.9:1) against the
              // same tint over the dark card color, hence the dark: override
              // back to a lighter shade (~6:1 there).
              <span className="rounded-full bg-green-500/10 px-2 py-0.5 font-medium text-green-800 dark:text-green-500">
                {t("customsCleared")}
              </span>
            ) : (
              <span className="rounded-full bg-amber-500/10 px-2 py-0.5 font-medium text-amber-800 dark:text-amber-500">
                {t("customsNotCleared")}
              </span>
            )}
            <span className="rounded-full border border-border px-2 py-0.5">
              {pickLookupName(listing.condition, locale)}
            </span>
            <span className="rounded-full border border-border px-2 py-0.5">
              {pickLookupName(listing.color, locale)}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {activeDiscount ? (
            <>
              <span className="text-sm text-muted-foreground line-through">
                {formatPrice(priceDisplay.convert(listing.price), priceDisplay.displayCurrency)}
              </span>
              <span className="text-lg font-bold text-primary-text">
                {formatPrice(priceDisplay.convert(activeDiscount.discountPrice), priceDisplay.displayCurrency)}
              </span>
            </>
          ) : (
            <span className="text-lg font-bold text-primary-text">
              {formatPrice(priceDisplay.convert(listing.price), priceDisplay.displayCurrency)}
            </span>
          )}
          {priceDisplay.canToggle && (
            <CurrencyToggleButton
              className="pointer-events-auto"
              label={t("toggleCurrency")}
              targetCurrency={priceDisplay.targetCurrency}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                priceDisplay.toggle();
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
