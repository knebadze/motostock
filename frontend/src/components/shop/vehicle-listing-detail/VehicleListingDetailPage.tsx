"use client";

import { useLocale, useTranslations } from "next-intl";
import { formatPrice } from "@/lib/format";
import { sanitizeRichText } from "@/lib/sanitize-html";
import { WishlistButton } from "@/components/shared/WishlistButton";
import { CompareButton } from "@/components/shared/CompareButton";
import { AddToCartButton } from "@/components/shared/AddToCartButton";
import type { VehicleListing } from "@/lib/api/vehicle-listings";
import type { Category } from "@/lib/api/categories";
import { Breadcrumb } from "../Breadcrumb";
import { ProductGallery } from "../product-detail/ProductGallery";
import { VehicleSpecs } from "./VehicleSpecs";
import { SimilarVehicleListings } from "./SimilarVehicleListings";

export function VehicleListingDetailPage({
  listing,
  breadcrumbChain,
  similarListings,
}: {
  listing: VehicleListing;
  breadcrumbChain: Category[];
  similarListings: VehicleListing[];
}) {
  const locale = useLocale() as "ka" | "en" | "ru";
  const t = useTranslations("VehicleListingDetail");
  const tShop = useTranslations("Shop");
  const tCart = useTranslations("Cart");

  const outOfStock = listing.stockQuantity === 0;
  const title = [listing.vehicleCatalog.model.name[locale], listing.vehicleCatalog.variant]
    .filter(Boolean)
    .join(" ");

  const images = listing.images.map((image) => ({ url: image.imageUrl, variantId: null }));
  const preferredImage = listing.images[0]?.imageUrl ?? listing.vehicleCatalog.imageUrl ?? null;

  const description =
    locale === "en"
      ? listing.descriptionEn
      : locale === "ru"
        ? listing.descriptionRu
        : listing.descriptionKa;

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
      <Breadcrumb chain={breadcrumbChain} currentLabel={title} />

      <div className="mt-6 grid grid-cols-1 gap-10 lg:grid-cols-2">
        <ProductGallery images={images} preferredImage={preferredImage} alt={title} />

        <div className="flex flex-col gap-5">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {listing.vehicleCatalog.brand.name[locale]} · {listing.year}
          </span>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">{title}</h1>

          <div className="flex flex-wrap items-center gap-3">
            {listing.activeDiscount ? (
              <>
                <span className="text-lg text-muted-foreground line-through">
                  {formatPrice(listing.price)}
                </span>
                <span className="text-2xl font-bold text-primary">
                  {formatPrice(listing.activeDiscount.discountPrice)}
                </span>
              </>
            ) : (
              <span className="text-2xl font-bold text-primary">{formatPrice(listing.price)}</span>
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

      {description && (
        <section className="mt-14 border-t border-border pt-8">
          <h2 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
            {t("descriptionHeading")}
          </h2>
          <div
            className="mt-5 text-base leading-7 text-foreground [&_h2]:mt-6 [&_h2]:text-lg [&_h2]:font-semibold [&_h3]:mt-4 [&_h3]:text-base [&_h3]:font-semibold [&_li]:ml-5 [&_ol]:list-decimal [&_p:last-child]:mb-0 [&_p]:mb-4 [&_ul]:list-disc"
            // Admin-authored rich text (same trust boundary as the JSON-LD
            // scripts already used on this page) — sanitized regardless as
            // defense-in-depth (see sanitizeRichText).
            dangerouslySetInnerHTML={{ __html: sanitizeRichText(description) }}
          />
        </section>
      )}

      <SimilarVehicleListings listings={similarListings} />
    </div>
  );
}
