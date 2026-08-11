"use client";

import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { resolveMediaUrl } from "@/lib/api/client";
import { formatPrice, pickLookupName } from "@/lib/format";
import { WishlistButton } from "@/components/shared/WishlistButton";
import { CompareButton } from "@/components/shared/CompareButton";
import type { VehicleListing } from "@/lib/api/vehicle-listings";
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
  // Passed by WishlistManager, which already knows every card here is
  // wishlisted — skips the status lookup and lets the card announce
  // removal so it can drop itself from that list.
  wishlistItemId?: number;
  onWishlistChange?: (wishlisted: boolean) => void;
  // Same idea as wishlistItemId/onWishlistChange, passed by CompareManager.
  compareItemId?: number;
  onCompareChange?: (compared: boolean) => void;
}) {
  const locale = useLocale() as "ka" | "en" | "ru";
  const t = useTranslations("Shop");
  // The listing's own photo (what's actually for sale) takes priority over
  // the catalog's generic reference image.
  const imageUrl = resolveMediaUrl(listing.images[0]?.imageUrl ?? listing.vehicleCatalog.imageUrl);
  const outOfStock = listing.stockQuantity === 0;
  const { activeDiscount } = listing;

  return (
    <Link
      href={`/${listing.vehicleCatalog.category.slug}/${listing.id}`}
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
          <Image
            src={imageUrl}
            alt={listing.vehicleCatalog.model.name[locale]}
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
          className="absolute bottom-1.5 right-1.5"
        />
        <CompareButton
          itemType="VEHICLE_LISTING"
          id={listing.id}
          initialCompareItemId={compareItemId}
          onChange={onCompareChange}
          labelAdd={t("compareAddLabel")}
          labelAdded={t("compareAddedLabel")}
          className="absolute bottom-1.5 left-1.5"
        />
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
    </Link>
  );
}
