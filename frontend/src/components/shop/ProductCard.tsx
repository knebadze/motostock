"use client";

import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { resolveMediaUrl } from "@/lib/api/client";
import { formatPrice } from "@/lib/format";
import { WishlistButton } from "@/components/shared/WishlistButton";
import { CompareButton } from "@/components/shared/CompareButton";
import type { Product } from "@/lib/api/products";
import type { ViewMode } from "./ViewModeToggle";

export function ProductCard({
  product,
  layout,
  wishlistItemId,
  onWishlistChange,
  compareItemId,
  onCompareChange,
}: {
  product: Product;
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
  const imageUrl = resolveMediaUrl(product.imageUrl);
  const outOfStock = product.totalStock === 0;
  const { activeDiscount } = product;

  return (
    // Not a <Link> itself — WishlistButton/CompareButton render real
    // <button>s, and a <button> nested inside an <a> is invalid HTML
    // (interactive content inside interactive content), which browsers
    // parse inconsistently and assistive tech announces incoherently. The
    // "stretched link" pattern below keeps the whole-card-is-clickable
    // behavior without nesting: an absolutely-positioned, content-less
    // Link covers the card as a sibling, and the actual visible content
    // sits on top with pointer-events-none so clicks fall through to the
    // Link everywhere except the two buttons, which opt back in with
    // pointer-events-auto and already stopPropagation their own clicks.
    <div
      className={`group relative h-full rounded-2xl border border-border bg-card p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary hover:shadow-lg ${
        layout === "list" ? "flex items-center gap-4" : "flex flex-col gap-3"
      }`}
    >
      <Link
        href={`/${product.category.slug}/${product.slug}`}
        aria-label={product.name[locale]}
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
            alt={product.name[locale]}
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
          itemType="PRODUCT"
          id={product.id}
          initialWishlistItemId={wishlistItemId}
          onChange={onWishlistChange}
          labelSave={t("wishlistSaveLabel")}
          labelSaved={t("wishlistSavedLabel")}
          className="pointer-events-auto absolute bottom-1.5 right-1.5"
        />
        <CompareButton
          itemType="PRODUCT"
          id={product.id}
          initialCompareItemId={compareItemId}
          onChange={onCompareChange}
          labelAdd={t("compareAddLabel")}
          labelAdded={t("compareAddedLabel")}
          className="pointer-events-auto absolute bottom-1.5 left-1.5"
        />
      </div>

      <div className="pointer-events-none flex flex-1 flex-col justify-between gap-1">
        <div className="flex flex-col gap-1">
          {product.productBrand && (
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {product.productBrand.name}
            </span>
          )}
          <span className="line-clamp-2 min-h-12 font-semibold text-foreground">
            {product.name[locale]}
          </span>
        </div>
        {activeDiscount ? (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground line-through">
              {formatPrice(activeDiscount.price)}
            </span>
            <span className="text-lg font-bold text-primary">
              {formatPrice(activeDiscount.discountPrice)}
            </span>
          </div>
        ) : (
          <span className="text-lg font-bold text-primary">
            {product.minPrice != null ? formatPrice(product.minPrice) : "—"}
          </span>
        )}
      </div>
    </div>
  );
}
