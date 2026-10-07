"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { formatPrice } from "@/lib/format";
import { useVehiclePriceDisplay } from "@/lib/useVehiclePriceDisplay";
import { WishlistButton } from "@/components/shared/WishlistButton";
import { CompareButton } from "@/components/shared/CompareButton";
import { AddToCartButton } from "@/components/shared/AddToCartButton";
import type { VehicleListing } from "@/lib/api/vehicle-listings";
import type { Category } from "@/lib/api/categories";
import { Breadcrumb } from "../Breadcrumb";
import { ProductGallery } from "../product-detail/ProductGallery";
import { VehicleSpecs } from "./VehicleSpecs";
import { CurrencyToggleButton } from "../CurrencyToggleButton";

export function VehicleListingDetailPage({
  listing,
  breadcrumbChain,
  similarListings,
  descriptionHtml,
}: {
  listing: VehicleListing;
  breadcrumbChain: Category[];
  // Streamed server section (see the route page) — the listing itself
  // doesn't wait for the similar-listings query.
  similarListings: ReactNode;
  // Current locale's description, sanitized on the server (see
  // ProductDetailPage's identical prop).
  descriptionHtml: string | null;
}) {
  const t = useTranslations("VehicleListingDetail");
  const tShop = useTranslations("Shop");
  const tCart = useTranslations("Cart");

  const outOfStock = listing.stockQuantity === 0;
  const priceDisplay = useVehiclePriceDisplay(listing.priceCurrency);
  const title = [listing.vehicleCatalog.model.name, listing.vehicleCatalog.variant]
    .filter(Boolean)
    .join(" ");

  const images = listing.images.map((image) => ({ url: image.imageUrl, variantId: null }));
  const preferredImage = listing.images[0]?.imageUrl ?? listing.vehicleCatalog.imageUrl ?? null;

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
      <Breadcrumb chain={breadcrumbChain} currentLabel={title} />

      <div className="mt-6 grid grid-cols-1 gap-10 lg:grid-cols-2">
        <ProductGallery images={images} preferredImage={preferredImage} alt={title} />

        <div className="flex flex-col gap-5">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {listing.vehicleCatalog.brand.name} · {listing.year}
          </span>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">{title}</h1>

          <div className="flex flex-wrap items-center gap-3">
            {listing.activeDiscount ? (
              <>
                <span className="text-lg text-muted-foreground line-through">
                  {formatPrice(priceDisplay.convert(listing.price), priceDisplay.displayCurrency)}
                </span>
                <span className="text-2xl font-bold text-primary-text">
                  {formatPrice(
                    priceDisplay.convert(listing.activeDiscount.discountPrice),
                    priceDisplay.displayCurrency,
                  )}
                </span>
              </>
            ) : (
              <span className="text-2xl font-bold text-primary-text">
                {formatPrice(priceDisplay.convert(listing.price), priceDisplay.displayCurrency)}
              </span>
            )}
            {priceDisplay.canToggle && (
              <CurrencyToggleButton
                label={tShop("toggleCurrency")}
                targetCurrency={priceDisplay.targetCurrency}
                onClick={() => priceDisplay.toggle()}
              />
            )}
            {outOfStock && (
              <span className="rounded-full bg-foreground/80 px-2.5 py-1 text-xs font-semibold text-background">
                {t("outOfStock")}
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <AddToCartButton
              itemType="VEHICLE_LISTING"
              id={listing.id}
              stockQuantity={listing.stockQuantity}
              disabled={outOfStock}
              labelAdd={tCart("addToCart")}
              labelAdded={tCart("addedToCart")}
              labelOutOfStock={tCart("outOfStock")}
              errorMessage={tCart("addError")}
            />
            <WishlistButton
              itemType="VEHICLE_LISTING"
              id={listing.id}
              variant="button"
              labelSave={tShop("wishlistSaveLabel")}
              labelSaved={tShop("wishlistSavedLabel")}
            />
            <CompareButton
              itemType="VEHICLE_LISTING"
              id={listing.id}
              variant="button"
              labelAdd={tShop("compareAddLabel")}
              labelAdded={tShop("compareAddedLabel")}
            />
          </div>

          <VehicleSpecs listing={listing} />
        </div>
      </div>

      {descriptionHtml && (
        <section className="mt-14 border-t border-border pt-8">
          <h2 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
            {t("descriptionHeading")}
          </h2>
          <div
            className="mt-5 text-base leading-7 text-foreground [&_h2]:mt-6 [&_h2]:text-lg [&_h2]:font-semibold [&_h3]:mt-4 [&_h3]:text-base [&_h3]:font-semibold [&_li]:ml-5 [&_ol]:list-decimal [&_p:last-child]:mb-0 [&_p]:mb-4 [&_ul]:list-disc"
            // Already sanitized on the server (the route page) — see
            // descriptionHtml's prop comment.
            dangerouslySetInnerHTML={{ __html: descriptionHtml }}
          />
        </section>
      )}

      {similarListings}
    </div>
  );
}
