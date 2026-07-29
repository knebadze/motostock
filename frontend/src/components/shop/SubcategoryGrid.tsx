"use client";

import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { resolveMediaUrl } from "@/lib/api/client";
import type { Category } from "@/lib/api/categories";

// Shown on parent-category shop pages (e.g. /transport, /gear) right below
// the hero — same card style as the header's mega-menu dropdown, so hovering
// the nav and landing on the category page feel like the same UI language.
export function SubcategoryGrid({ subcategories }: { subcategories: Category[] }) {
  const locale = useLocale() as "ka" | "en" | "ru";
  const t = useTranslations("Shop");

  if (subcategories.length === 0) return null;

  return (
    <div className="border-b border-border bg-card">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          {t("subcategoriesHeading")}
        </h2>
        <div className="grid grid-cols-3 gap-6 sm:grid-cols-4 lg:grid-cols-6">
          {subcategories.map((child) => {
            const imageUrl = resolveMediaUrl(child.imageUrl);
            return (
              <Link
                key={child.id}
                href={`/${child.slug}`}
                className="flex flex-col items-center gap-2 rounded-xl p-3 text-center transition-colors hover:bg-muted"
              >
                {imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={imageUrl}
                    alt={child.name[locale]}
                    className="size-16 rounded-lg border border-border object-cover"
                  />
                ) : (
                  <div className="size-16 rounded-lg border border-dashed border-border" />
                )}
                <span className="text-sm font-medium text-foreground">
                  {child.name[locale]}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
