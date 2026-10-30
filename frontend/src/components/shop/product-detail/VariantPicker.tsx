"use client";

import { useLocale, useTranslations } from "next-intl";
import { pickLookupName } from "@/lib/format";
import type { ProductVariantDetail } from "@/lib/api/products";

export function VariantPicker({
  variants,
  selectedVariant,
  onSelect,
}: {
  variants: ProductVariantDetail[];
  selectedVariant: ProductVariantDetail;
  onSelect: (variantId: number) => void;
}) {
  const locale = useLocale() as "ka" | "en" | "ru";
  const t = useTranslations("ProductDetail");

  const sizes = Array.from(
    new Map(variants.filter((variant) => variant.size).map((variant) => [variant.size!.id, variant.size!])).values(),
  );
  const colors = Array.from(
    new Map(variants.filter((variant) => variant.color).map((variant) => [variant.color!.id, variant.color!])).values(),
  );

  function pickSize(sizeId: number) {
    const match =
      variants.find((variant) => variant.size?.id === sizeId && variant.color?.id === selectedVariant.color?.id) ??
      variants.find((variant) => variant.size?.id === sizeId);
    if (match) onSelect(match.id);
  }

  function pickColor(colorId: number) {
    const match =
      variants.find((variant) => variant.color?.id === colorId && variant.size?.id === selectedVariant.size?.id) ??
      variants.find((variant) => variant.color?.id === colorId);
    if (match) onSelect(match.id);
  }

  // Sold out = every variant with this size (or color) is at 0 stock —
  // counting only combinations with the other currently picked attribute
  // when any exist (size S may be sold out in red but not in black). Still
  // clickable — the page then shows "out of stock" for that variant.
  function isSoldOut(
    matches: (variant: ProductVariantDetail) => boolean,
    sameOther: (variant: ProductVariantDetail) => boolean,
  ) {
    const candidates = variants.filter(matches);
    const withOther = candidates.filter(sameOther);
    return (withOther.length > 0 ? withOther : candidates).every((variant) => variant.stockQuantity <= 0);
  }
  const sizeSoldOut = (sizeId: number) =>
    isSoldOut(
      (variant) => variant.size?.id === sizeId,
      (variant) => variant.color?.id === selectedVariant.color?.id,
    );
  const colorSoldOut = (colorId: number) =>
    isSoldOut(
      (variant) => variant.color?.id === colorId,
      (variant) => variant.size?.id === selectedVariant.size?.id,
    );

  function optionClassName(selected: boolean, soldOut: boolean) {
    const base = "rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors";
    if (selected) return `${base} border-primary bg-primary text-primary-foreground ${soldOut ? "line-through" : ""}`;
    return soldOut
      ? `${base} border-dashed border-border text-muted-foreground line-through hover:border-primary`
      : `${base} border-border text-foreground hover:border-primary`;
  }

  if (sizes.length === 0 && colors.length === 0) return null;

  return (
    <div className="flex flex-col gap-4">
      {sizes.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium text-foreground">{t("selectSizeLabel")}</span>
          <div className="flex flex-wrap gap-2">
            {sizes.map((size) => {
              const soldOut = sizeSoldOut(size.id);
              return (
                <button
                  key={size.id}
                  type="button"
                  onClick={() => pickSize(size.id)}
                  aria-pressed={selectedVariant.size?.id === size.id}
                  title={soldOut ? t("outOfStock") : undefined}
                  className={optionClassName(selectedVariant.size?.id === size.id, soldOut)}
                >
                  {pickLookupName(size, locale)}
                  {soldOut && <span className="sr-only"> — {t("outOfStock")}</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {colors.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium text-foreground">{t("selectColorLabel")}</span>
          <div className="flex flex-wrap gap-2">
            {colors.map((color) => {
              const soldOut = colorSoldOut(color.id);
              return (
                <button
                  key={color.id}
                  type="button"
                  onClick={() => pickColor(color.id)}
                  aria-pressed={selectedVariant.color?.id === color.id}
                  title={soldOut ? t("outOfStock") : undefined}
                  className={optionClassName(selectedVariant.color?.id === color.id, soldOut)}
                >
                  {pickLookupName(color, locale)}
                  {soldOut && <span className="sr-only"> — {t("outOfStock")}</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
