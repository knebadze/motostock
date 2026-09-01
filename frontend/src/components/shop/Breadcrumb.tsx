"use client";

import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { Category } from "@/lib/api/categories";

export function Breadcrumb({
  chain,
  currentLabel,
  variant = "light",
}: {
  chain: Category[];
  // When provided, every entry in `chain` renders as a link and this becomes
  // the final, non-linked "current" crumb instead (e.g. a product name on
  // the product detail page, where the category itself is still browsable).
  currentLabel?: string;
  // "light" = sits on a light/default background, use dark text.
  // "dark" = sits on a dark hero overlay (banner image), use white text.
  variant?: "light" | "dark";
}) {
  const locale = useLocale() as "ka" | "en" | "ru";
  const tNav = useTranslations("Nav");
  const tCommon = useTranslations("Common");
  const onDarkBackground = variant === "dark";

  const linkClassName = onDarkBackground
    ? "text-white/75 transition-colors hover:text-white"
    : "text-muted-foreground transition-colors hover:text-foreground";
  const currentClassName = onDarkBackground ? "text-white" : "text-foreground";
  const separatorClassName = onDarkBackground ? "text-white/50" : "text-muted-foreground/60";

  return (
    <nav aria-label={tCommon("breadcrumbLabel")}>
      <ol className="flex flex-wrap items-center justify-center gap-1.5 text-sm">
        <li>
          <Link href="/" className={linkClassName}>
            {tNav("home")}
          </Link>
        </li>
        {chain.map((category, index) => {
          const isCurrent = !currentLabel && index === chain.length - 1;
          return (
            <li key={category.id} className="flex items-center gap-1.5">
              <span aria-hidden="true" className={separatorClassName}>
                /
              </span>
              {isCurrent ? (
                <span aria-current="page" className={`font-medium ${currentClassName}`}>
                  {category.name[locale]}
                </span>
              ) : (
                <Link href={`/${category.slug}`} className={linkClassName}>
                  {category.name[locale]}
                </Link>
              )}
            </li>
          );
        })}
        {currentLabel && (
          <li className="flex items-center gap-1.5">
            <span aria-hidden="true" className={separatorClassName}>
              /
            </span>
            <span aria-current="page" className={`font-medium ${currentClassName}`}>
              {currentLabel}
            </span>
          </li>
        )}
      </ol>
    </nav>
  );
}
