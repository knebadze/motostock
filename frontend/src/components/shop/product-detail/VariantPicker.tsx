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
    new Map(
      variants.filter((variant) => variant.size).map((variant) => [variant.size!.id, variant.size!]),
    ).values(),
  );
  const colors = Array.from(
    new Map(
      variants
        .filter((variant) => variant.color)
        .map((variant) => [variant.color!.id, variant.color!]),
    ).values(),
  );

  function pickSize(sizeId: number) {
    const match =
      variants.find(
        (variant) => variant.size?.id === sizeId && variant.color?.id === selectedVariant.color?.id,
      ) ?? variants.find((variant) => variant.size?.id === sizeId);
    if (match) onSelect(match.id);
  }

  function pickColor(colorId: number) {
    const match =
      variants.find(
        (variant) => variant.color?.id === colorId && variant.size?.id === selectedVariant.size?.id,
      ) ?? variants.find((variant) => variant.color?.id === colorId);
    if (match) onSelect(match.id);
  }

  if (sizes.length === 0 && colors.length === 0) return null;

  return (
    <div className="flex flex-col gap-4">
      {sizes.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium text-foreground">{t("selectSizeLabel")}</span>
          <div className="flex flex-wrap gap-2">
            {sizes.map((size) => (
              <button
                key={size.id}
                type="button"
                onClick={() => pickSize(size.id)}
                aria-pressed={selectedVariant.size?.id === size.id}
                className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                  selectedVariant.size?.id === size.id
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border text-foreground hover:border-primary"
                }`}
              >
                {pickLookupName(size, locale)}
              </button>
            ))}
          </div>
        </div>
      )}

      {colors.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium text-foreground">{t("selectColorLabel")}</span>
          <div className="flex flex-wrap gap-2">
            {colors.map((color) => (
              <button
                key={color.id}
                type="button"
                onClick={() => pickColor(color.id)}
                aria-pressed={selectedVariant.color?.id === color.id}
                className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                  selectedVariant.color?.id === color.id
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border text-foreground hover:border-primary"
                }`}
              >
                {pickLookupName(color, locale)}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
