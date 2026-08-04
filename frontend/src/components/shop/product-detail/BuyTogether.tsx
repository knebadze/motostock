"use client";

import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { resolveMediaUrl } from "@/lib/api/client";
import { formatPrice } from "@/lib/format";
import type { Product, ProductDetail } from "@/lib/api/products";

function effectivePrice(product: Product): number {
  return product.activeDiscount ? product.activeDiscount.discountPrice : (product.minPrice ?? 0);
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

// There's no cart on this site yet, so this is a discovery/cross-sell strip
// (e.g. a chain suggesting cleaner fluid + a brush) rather than a functional
// "add all to cart" widget — each card links to its own product page, with
// the combined price shown purely as a convenience total.
export function BuyTogether({ product }: { product: ProductDetail }) {
  const t = useTranslations("ProductDetail");

  if (product.buyTogether.length === 0) return null;

  const total =
    effectivePrice(product) +
    product.buyTogether.reduce((sum, item) => sum + effectivePrice(item), 0);

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
      <div className="mt-4 flex items-center gap-2 text-sm">
        <span className="text-muted-foreground">{t("buyTogetherTotalLabel")}</span>
        <span className="text-lg font-bold text-primary">{formatPrice(total)}</span>
      </div>
    </section>
  );
}
