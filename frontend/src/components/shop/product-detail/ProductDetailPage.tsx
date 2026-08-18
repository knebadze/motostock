"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { formatPrice, pickLookupName } from "@/lib/format";
import { sanitizeRichText } from "@/lib/sanitize-html";
import { WishlistButton } from "@/components/shared/WishlistButton";
import { CompareButton } from "@/components/shared/CompareButton";
import { AddToCartButton } from "@/components/shared/AddToCartButton";
import type {
  Product,
  ProductDetail,
  ProductFitmentRuleSummary,
  ProductVariantDetail,
} from "@/lib/api/products";
import type { Category } from "@/lib/api/categories";
import { Breadcrumb } from "../Breadcrumb";
import { ProductGallery } from "./ProductGallery";
import { VariantPicker } from "./VariantPicker";
import { ProductSpecs } from "./ProductSpecs";
import { SimilarProducts } from "./SimilarProducts";
import { BuyTogether } from "./BuyTogether";
import { FrequentlyBoughtTogether } from "./FrequentlyBoughtTogether";
import { ViewedTogether } from "./ViewedTogether";

// The thumbnail strip always shows every photo across every variant (plus
// the product's own image as a fallback) so it stays populated and browsable
// no matter what's currently selected above. Each thumbnail keeps a link to
// the variant it belongs to, so picking one also selects that variant's
// color/size (and vice versa).
function collectGalleryImages(product: ProductDetail): { url: string; variantId: number | null }[] {
  const byUrl = new Map<string, number>();
  for (const variant of product.variants) {
    for (const image of variant.images) {
      if (!byUrl.has(image.imageUrl)) byUrl.set(image.imageUrl, variant.id);
    }
  }

  if (byUrl.size > 0) {
    return Array.from(byUrl, ([url, variantId]) => ({ url, variantId }));
  }
  return product.imageUrl ? [{ url: product.imageUrl, variantId: null }] : [];
}

// Rule-based compatibility (category/spec/all) is summarized as one badge
// each, not enumerated into individual vehicles — an "all vehicles" rule
// would otherwise mean listing hundreds of catalog rows.
function fitmentRuleLabel(
  rule: ProductFitmentRuleSummary,
  locale: "ka" | "en" | "ru",
  allVehiclesLabel: string,
): string {
  if (rule.type === "ALL") return allVehiclesLabel;
  if (rule.type === "CATEGORY") return rule.category?.name[locale] ?? "";
  const fieldLabel = rule.specFieldLabel?.[locale] ?? "";
  const value = rule.specValue ? pickLookupName(rule.specValue, locale) : "";
  return `${fieldLabel}: ${value}`;
}

// The hero image, on the other hand, should track the current selection: the
// selected variant's own photo if it has one; otherwise another size in the
// same color (the picture shows the color, not the size); otherwise the
// product's own image.
function resolvePreferredImage(
  product: ProductDetail,
  selectedVariant: ProductVariantDetail | null,
): string | null {
  if (selectedVariant && selectedVariant.images.length > 0) {
    return selectedVariant.images[0].imageUrl;
  }

  if (selectedVariant?.color) {
    const sameColor = product.variants.find(
      (variant) => variant.color?.id === selectedVariant.color!.id && variant.images.length > 0,
    );
    if (sameColor) return sameColor.images[0].imageUrl;
  }

  return product.imageUrl ?? null;
}

export function ProductDetailPage({
  product,
  breadcrumbChain,
  similarProducts,
  frequentlyBoughtTogether,
  viewedTogether,
}: {
  product: ProductDetail;
  breadcrumbChain: Category[];
  similarProducts: Product[];
  frequentlyBoughtTogether: Product[];
  viewedTogether: Product[];
}) {
  const locale = useLocale() as "ka" | "en" | "ru";
  const t = useTranslations("ProductDetail");
  const tShop = useTranslations("Shop");
  const tCart = useTranslations("Cart");

  const defaultVariant =
    product.variants.find((variant) => variant.stockQuantity > 0) ?? product.variants[0] ?? null;
  const [selectedVariantId, setSelectedVariantId] = useState<number | null>(
    defaultVariant?.id ?? null,
  );
  const selectedVariant =
    product.variants.find((variant) => variant.id === selectedVariantId) ?? defaultVariant;

  const outOfStock = !selectedVariant || selectedVariant.stockQuantity === 0;
  const images = collectGalleryImages(product);
  const preferredImage = resolvePreferredImage(product, selectedVariant);

  const description =
    locale === "en" ? product.descriptionEn : locale === "ru" ? product.descriptionRu : product.descriptionKa;

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
      <Breadcrumb chain={breadcrumbChain} currentLabel={product.name[locale]} />

      <div className="mt-6 grid grid-cols-1 gap-10 lg:grid-cols-2">
        <ProductGallery
          key={selectedVariant?.id ?? "none"}
          images={images}
          preferredImage={preferredImage}
          onSelectVariant={setSelectedVariantId}
          alt={product.name[locale]}
        />

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

          <div className="flex flex-wrap items-center gap-3">
            {selectedVariant && (
              <AddToCartButton
                itemType="PRODUCT_VARIANT"
                id={selectedVariant.id}
                stockQuantity={selectedVariant.stockQuantity}
                disabled={outOfStock}
                labelAdd={tCart("addToCart")}
                labelAdded={tCart("addedToCart")}
                labelOutOfStock={tCart("outOfStock")}
                errorMessage={tCart("addError")}
              />
            )}
            <WishlistButton
              itemType="PRODUCT"
              id={product.id}
              variant="button"
              labelSave={tShop("wishlistSaveLabel")}
              labelSaved={tShop("wishlistSavedLabel")}
            />
            <CompareButton
              itemType="PRODUCT"
              id={product.id}
              variant="button"
              labelAdd={tShop("compareAddLabel")}
              labelAdded={tShop("compareAddedLabel")}
            />
          </div>

          <ProductSpecs attributeValues={product.attributeValues} />

          {(product.fitments.length > 0 || product.fitmentRules.length > 0) && (
            <div className="flex flex-col gap-2">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                {t("compatibleVehiclesHeading")}
              </h2>
              <ul className="flex flex-wrap gap-2 text-sm">
                {product.fitmentRules.map((rule) => (
                  <li
                    key={`rule-${rule.id}`}
                    className="rounded-full border border-primary/40 bg-primary/5 px-3 py-1 text-primary"
                  >
                    {fitmentRuleLabel(rule, locale, t("compatibleAllVehicles"))}
                  </li>
                ))}
                {product.fitments.map((fitment) => (
                  <li key={fitment.id} className="rounded-full border border-border px-3 py-1">
                    {fitment.brand.name} {fitment.model.name}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      <BuyTogether product={product} />
      <FrequentlyBoughtTogether products={frequentlyBoughtTogether} />
      <ViewedTogether products={viewedTogether} />

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

      <SimilarProducts products={similarProducts} />
    </div>
  );
}
