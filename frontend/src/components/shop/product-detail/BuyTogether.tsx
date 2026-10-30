"use client";

import { useState } from "react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { resolveMediaUrl, ApiRequestError } from "@/lib/api/client";
import { resolveApiErrorMessage } from "@/lib/api-errors";
import { formatPrice } from "@/lib/format";
import { addToCart } from "@/lib/api/cart";
import { getProductBySlug } from "@/lib/api/products";
import type { ProductDetail, ProductListItem, ProductVariantDetail } from "@/lib/api/products";

function effectivePrice(product: ProductListItem): number {
  return product.activeDiscount ? product.activeDiscount.discountPrice : (product.minPrice ?? 0);
}

// Same "cheapest reasonable default" a shopper would land on if they opened
// the product page themselves and didn't touch the variant picker — mirrors
// ProductDetailPage's own defaultVariant resolution exactly.
function resolveDefaultVariant(variants: ProductVariantDetail[]): ProductVariantDetail | null {
  return variants.find((variant) => variant.stockQuantity > 0) ?? variants[0] ?? null;
}

function regularPrice(product: ProductListItem): number {
  return product.activeDiscount ? product.activeDiscount.price : (product.minPrice ?? 0);
}

function PriceText({ product }: { product: ProductListItem }) {
  return product.activeDiscount ? (
    <span className="flex flex-wrap items-baseline gap-x-1.5">
      <span className="text-sm font-bold text-primary-text">{formatPrice(product.activeDiscount.discountPrice)}</span>
      <span className="text-xs text-muted-foreground line-through">{formatPrice(product.activeDiscount.price)}</span>
    </span>
  ) : (
    <span className="text-sm font-bold text-primary-text">{formatPrice(product.minPrice ?? 0)}</span>
  );
}

// One bundle item. sm+: a card — tick in the corner (the anchor gets a
// "this product" badge instead and is always included), image, name,
// price. Phones: a compact row (tick, 56px thumbnail, name, price) so the
// whole bundle takes a fraction of the height a 2-column card grid did.
// Unticked companions fade out; image/name link to the product.
function BuyTogetherCard({
  product,
  isAnchor,
  checked,
  onToggle,
  thisProductLabel,
}: {
  product: ProductListItem;
  isAnchor: boolean;
  checked: boolean;
  onToggle: () => void;
  thisProductLabel: string;
}) {
  const locale = useLocale() as "ka" | "en" | "ru";
  const imageUrl = resolveMediaUrl(product.imageUrl);

  return (
    <li
      className={`relative flex items-center gap-3 rounded-xl border bg-card p-2.5 transition-colors sm:flex-col sm:items-stretch sm:gap-2 sm:rounded-2xl sm:p-3 ${
        checked ? "border-primary/60" : "border-border opacity-60"
      }`}
    >
      <span className="flex shrink-0 sm:absolute sm:left-3 sm:top-3 sm:z-10">
        {isAnchor ? (
          <>
            {/* Phones: a locked tick keeps the rows aligned; sm+: badge. */}
            <input
              type="checkbox"
              checked
              disabled
              aria-label={thisProductLabel}
              className="size-4 rounded border-border accent-primary sm:hidden"
            />
            <span className="hidden rounded-full bg-foreground/80 px-2 py-0.5 text-[11px] font-semibold text-background sm:inline">
              {thisProductLabel}
            </span>
          </>
        ) : (
          <input
            type="checkbox"
            checked={checked}
            onChange={onToggle}
            aria-label={product.name[locale]}
            className="size-4 rounded border-border accent-primary"
          />
        )}
      </span>
      <Link
        href={`/${product.category.slug}/${product.slug}`}
        className="flex min-w-0 flex-1 items-center gap-3 hover:text-primary-text sm:flex-col sm:items-stretch sm:gap-2"
      >
        <span className="relative block size-14 shrink-0 overflow-hidden rounded-lg border border-border bg-muted sm:aspect-square sm:size-auto sm:w-full sm:rounded-xl">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={product.name[locale]}
              fill
              sizes="(min-width: 1024px) 160px, (min-width: 640px) 30vw, 56px"
              className="object-cover"
            />
          ) : null}
        </span>
        <span className="min-w-0">
          <span className="line-clamp-2 text-sm font-medium leading-snug sm:min-h-10">{product.name[locale]}</span>
          {isAnchor && <span className="block text-xs text-muted-foreground sm:hidden">{thisProductLabel}</span>}
        </span>
      </Link>
      <span className="shrink-0">
        <PriceText product={product} />
      </span>
    </li>
  );
}

export function BuyTogether({
  product,
  blockedCategoryIds,
}: {
  product: ProductDetail;
  // Categories switched off for online purchase — companions in them are
  // left out of the bundle (the cart would refuse them).
  blockedCategoryIds: number[];
}) {
  const t = useTranslations("ProductDetail");
  const tCart = useTranslations("Cart");
  const tErrors = useTranslations("ApiErrors");
  const router = useRouter();
  const pathname = usePathname();
  const [status, setStatus] = useState<"idle" | "loading" | "added">("idle");
  const companions = product.buyTogether.filter((item) => !blockedCategoryIds.includes(item.category.id));
  // Companions the shopper kept ticked (all by default); the anchor product
  // is always part of the bundle.
  const [selectedIds, setSelectedIds] = useState<number[]>(() => companions.map((item) => item.id));

  if (companions.length === 0) return null;

  const selectedCompanions = companions.filter((item) => selectedIds.includes(item.id));
  const bundle = [product, ...selectedCompanions];
  const total = bundle.reduce((sum, item) => sum + effectivePrice(item), 0);
  const savings = bundle.reduce((sum, item) => sum + regularPrice(item), 0) - total;

  function toggleCompanion(id: number) {
    setSelectedIds((current) => (current.includes(id) ? current.filter((x) => x !== id) : [...current, id]));
  }

  async function handleAddAll() {
    if (status === "loading") return;
    setStatus("loading");

    try {
      // The anchor product already carries full variant detail (this is its
      // own detail page); each companion is only a summary row, so its
      // variants get fetched on demand — only when the shopper actually
      // clicks this button, not on every page load.
      const companionDetails = await Promise.all(
        selectedCompanions.map((item) => getProductBySlug(item.slug)),
      );

      const candidateVariants = [
        resolveDefaultVariant(product.variants),
        ...companionDetails.map((detail) => resolveDefaultVariant(detail.variants)),
      ];
      const variantsToAdd = candidateVariants.filter(
        (variant): variant is ProductVariantDetail => variant != null && variant.stockQuantity > 0,
      );

      if (variantsToAdd.length === 0) {
        toast.error(t("buyTogetherOutOfStock"));
        setStatus("idle");
        return;
      }

      // Sequential, not Promise.all — each call mutates the same cart, so
      // this avoids a race on the "does a row for this variant already
      // exist" check inside cart.service.ts.
      for (const variant of variantsToAdd) {
        await addToCart({ itemType: "PRODUCT_VARIANT", productVariantId: variant.id });
      }

      setStatus("added");
      router.refresh();

      const skippedCount = candidateVariants.length - variantsToAdd.length;
      if (skippedCount > 0) {
        toast(t("buyTogetherPartiallyAdded"));
      }
      setTimeout(() => setStatus("idle"), 2000);
    } catch (error) {
      setStatus("idle");
      if (error instanceof ApiRequestError && error.status === 401) {
        router.push({ pathname: "/login", query: { redirect: pathname } });
        return;
      }
      toast.error(resolveApiErrorMessage(error, tErrors, tCart("addError")));
    }
  }

  return (
    <section className="mt-14 border-t border-border pt-8">
      <h2 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
        {t("buyTogetherHeading")}
      </h2>
      <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_16rem]">
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-5">
          <BuyTogetherCard
            product={product}
            isAnchor
            checked
            onToggle={() => {}}
            thisProductLabel={t("buyTogetherThisProduct")}
          />
          {companions.map((item) => (
            <BuyTogetherCard
              key={item.id}
              product={item}
              isAnchor={false}
              checked={selectedIds.includes(item.id)}
              onToggle={() => toggleCompanion(item.id)}
              thisProductLabel={t("buyTogetherThisProduct")}
            />
          ))}
        </ul>
        <div className="flex h-fit flex-col gap-2 rounded-2xl border border-border bg-card p-4 sm:p-5 lg:sticky lg:top-44">
          <span className="text-sm text-muted-foreground">{t("buyTogetherSelectedCount", { count: bundle.length })}</span>
          <span className="text-2xl font-bold text-primary-text">{formatPrice(total)}</span>
          {savings > 0.005 && (
            <span className="text-xs font-medium text-green-700 dark:text-green-500">
              {t("buyTogetherSavings", { amount: formatPrice(savings) })}
            </span>
          )}
          <button
            type="button"
            onClick={handleAddAll}
            disabled={status === "loading"}
            className={`mt-2 w-full rounded-full px-5 py-2.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
              status === "added"
                ? "bg-green-600 text-white"
                : "bg-primary text-primary-foreground hover:bg-primary-hover"
            }`}
          >
            {status === "added" ? tCart("addedToCart") : t("buyTogetherAddSelected", { count: bundle.length })}
          </button>
        </div>
      </div>
    </section>
  );
}
