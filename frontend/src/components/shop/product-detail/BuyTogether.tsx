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
import type { Product, ProductDetail, ProductVariantDetail } from "@/lib/api/products";

function effectivePrice(product: Product): number {
  return product.activeDiscount ? product.activeDiscount.discountPrice : (product.minPrice ?? 0);
}

// Same "cheapest reasonable default" a shopper would land on if they opened
// the product page themselves and didn't touch the variant picker — mirrors
// ProductDetailPage's own defaultVariant resolution exactly.
function resolveDefaultVariant(variants: ProductVariantDetail[]): ProductVariantDetail | null {
  return variants.find((variant) => variant.stockQuantity > 0) ?? variants[0] ?? null;
}

function BuyTogetherCard({ product }: { product: Product }) {
  const locale = useLocale() as "ka" | "en" | "ru";
  const imageUrl = resolveMediaUrl(product.imageUrl);

  return (
    <Link
      href={`/${product.category.slug}/${product.slug}`}
      className="flex w-28 shrink-0 flex-col items-center gap-2 text-center transition-opacity hover:opacity-80 sm:w-36"
    >
      <div className="relative aspect-square w-full overflow-hidden rounded-xl border border-border bg-muted">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={product.name[locale]}
            fill
            sizes="144px"
            className="object-cover"
          />
        ) : (
          <div className="size-full border border-dashed border-border" />
        )}
      </div>
      <span className="line-clamp-2 text-xs font-medium text-foreground">{product.name[locale]}</span>
      <span className="text-sm font-semibold text-primary">{formatPrice(effectivePrice(product))}</span>
    </Link>
  );
}

export function BuyTogether({ product }: { product: ProductDetail }) {
  const t = useTranslations("ProductDetail");
  const tCart = useTranslations("Cart");
  const tErrors = useTranslations("ApiErrors");
  const router = useRouter();
  const pathname = usePathname();
  const [status, setStatus] = useState<"idle" | "loading" | "added">("idle");

  if (product.buyTogether.length === 0) return null;

  const total =
    effectivePrice(product) +
    product.buyTogether.reduce((sum, item) => sum + effectivePrice(item), 0);

  async function handleAddAll() {
    if (status === "loading") return;
    setStatus("loading");

    try {
      // The anchor product already carries full variant detail (this is its
      // own detail page); each companion is only a summary row, so its
      // variants get fetched on demand — only when the shopper actually
      // clicks this button, not on every page load.
      const companionDetails = await Promise.all(
        product.buyTogether.map((item) => getProductBySlug(item.slug)),
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
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <BuyTogetherCard product={product} />
        {product.buyTogether.map((item) => (
          <div key={item.id} className="flex items-center gap-3">
            <span className="text-xl text-muted-foreground">+</span>
            <BuyTogetherCard product={item} />
          </div>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">{t("buyTogetherTotalLabel")}</span>
          <span className="text-lg font-bold text-primary">{formatPrice(total)}</span>
        </div>
        <button
          type="button"
          onClick={handleAddAll}
          disabled={status === "loading"}
          className={`rounded-full px-5 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
            status === "added"
              ? "bg-green-600 text-white"
              : "bg-primary text-primary-foreground hover:bg-primary-hover"
          }`}
        >
          {status === "added" ? tCart("addedToCart") : t("buyTogetherAddAll")}
        </button>
      </div>
    </section>
  );
}
