"use client";

import { useLocale, useTranslations } from "next-intl";
import { resolveMediaUrl } from "@/lib/api/client";
import { formatPrice } from "@/lib/format";
import type { Product } from "@/lib/api/products";
import type { ViewMode } from "./ViewModeToggle";

export function ProductCard({ product, layout }: { product: Product; layout: ViewMode }) {
  const locale = useLocale() as "ka" | "en" | "ru";
  const t = useTranslations("Shop");
  const imageUrl = resolveMediaUrl(product.imageUrl);
  const outOfStock = product.totalStock === 0;

  return (
    <div
      className={`rounded-2xl border border-border bg-card p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary hover:shadow-lg ${
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
          <img src={imageUrl} alt="" className="size-full object-cover" />
        ) : (
          <div className="size-full border border-dashed border-border" />
        )}
        {outOfStock && (
          <span className="absolute left-2 top-2 rounded-full bg-foreground/80 px-2 py-0.5 text-xs font-semibold text-background">
            {t("outOfStock")}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-1">
        {product.productBrand && (
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {product.productBrand.name[locale]}
          </span>
        )}
        <span className="line-clamp-2 font-semibold text-foreground">{product.name[locale]}</span>
        <span className="text-lg font-bold text-primary">
          {product.minPrice != null ? formatPrice(product.minPrice) : "—"}
        </span>
      </div>
    </div>
  );
}
