"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { formatPrice } from "@/lib/format";
import type { ProductDetail } from "@/lib/api/products";
import type { Category } from "@/lib/api/categories";
import { Breadcrumb } from "../Breadcrumb";
import { ProductGallery } from "./ProductGallery";
import { VariantPicker } from "./VariantPicker";
import { ProductSpecs } from "./ProductSpecs";

export function ProductDetailPage({
  product,
  breadcrumbChain,
}: {
  product: ProductDetail;
  breadcrumbChain: Category[];
}) {
  const locale = useLocale() as "ka" | "en" | "ru";
  const t = useTranslations("ProductDetail");

  const defaultVariant =
    product.variants.find((variant) => variant.stockQuantity > 0) ?? product.variants[0] ?? null;
  const [selectedVariantId, setSelectedVariantId] = useState<number | null>(
    defaultVariant?.id ?? null,
  );
  const selectedVariant =
    product.variants.find((variant) => variant.id === selectedVariantId) ?? defaultVariant;

  const outOfStock = !selectedVariant || selectedVariant.stockQuantity === 0;
  const images =
    selectedVariant && selectedVariant.images.length > 0
      ? selectedVariant.images.map((image) => image.imageUrl)
      : product.imageUrl
        ? [product.imageUrl]
        : [];

  const description =
    locale === "en" ? product.descriptionEn : locale === "ru" ? product.descriptionRu : product.descriptionKa;

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
      <Breadcrumb chain={breadcrumbChain} currentLabel={product.name[locale]} />

      <div className="mt-6 grid grid-cols-1 gap-10 lg:grid-cols-2">
        <ProductGallery key={selectedVariant?.id ?? "none"} images={images} alt={product.name[locale]} />

        <div className="flex flex-col gap-5">
          {product.productBrand && (
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {product.productBrand.name[locale]}
            </span>
          )}
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            {product.name[locale]}
          </h1>

          {selectedVariant && (
            <div className="flex flex-wrap items-center gap-3">
              {selectedVariant.activeDiscount ? (
                <>
                  <span className="text-lg text-muted-foreground line-through">
                    {formatPrice(selectedVariant.price)}
                  </span>
                  <span className="text-2xl font-bold text-primary">
                    {formatPrice(selectedVariant.activeDiscount.discountPrice)}
                  </span>
                </>
              ) : (
                <span className="text-2xl font-bold text-primary">
                  {formatPrice(selectedVariant.price)}
                </span>
              )}
              {outOfStock && (
                <span className="rounded-full bg-foreground/80 px-2.5 py-1 text-xs font-semibold text-background">
                  {t("outOfStock")}
                </span>
              )}
            </div>
          )}

          {product.variants.length > 1 && selectedVariant && (
            <VariantPicker
              variants={product.variants}
              selectedVariant={selectedVariant}
              onSelect={setSelectedVariantId}
            />
          )}

          {description && (
            <div className="flex flex-col gap-2">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                {t("descriptionHeading")}
              </h2>
              <div
                className="text-sm leading-relaxed text-foreground [&_p:last-child]:mb-0 [&_p]:mb-3"
                // Admin-authored rich text (same trust boundary as the JSON-LD
                // scripts already used on this page) — not user input.
                dangerouslySetInnerHTML={{ __html: description }}
              />
            </div>
          )}

          <ProductSpecs attributeValues={product.attributeValues} />

          {product.fitments.length > 0 && (
            <div className="flex flex-col gap-2">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                {t("compatibleVehiclesHeading")}
              </h2>
              <ul className="flex flex-wrap gap-2 text-sm">
                {product.fitments.map((fitment) => (
                  <li key={fitment.id} className="rounded-full border border-border px-3 py-1">
                    {fitment.brand.name[locale]} {fitment.model.name[locale]}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
