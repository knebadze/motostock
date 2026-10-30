"use client";

import { useLocale, useTranslations } from "next-intl";
import type { Category } from "@/lib/api/categories";

// The category page's direct subcategories as filter checkboxes (replaces
// the old subcategory card grid above the listing — the header menu already
// lists every subcategory). Picking several narrows the list to their union;
// the page sends each picked subcategory's whole subtree (see
// subcategoryCategoryIds on ProductShopPage/VehicleShopPage).
export function SubcategoryFilter({
  subcategories,
  selectedIds,
  onToggle,
}: {
  subcategories: Category[];
  selectedIds: number[];
  onToggle: (subcategoryId: number) => void;
}) {
  const locale = useLocale() as "ka" | "en" | "ru";
  const t = useTranslations("Shop");

  if (subcategories.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium">{t("subcategoriesHeading")}</span>
      <div className="flex flex-col gap-1.5">
        {subcategories.map((subcategory) => (
          <label key={subcategory.id} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={selectedIds.includes(subcategory.id)}
              onChange={() => onToggle(subcategory.id)}
              className="size-4 rounded border-border accent-primary"
            />
            {subcategory.name[locale]}
          </label>
        ))}
      </div>
    </div>
  );
}
