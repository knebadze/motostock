"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Select } from "@/components/shared/Select";
import { flattenTree } from "@/lib/categories-tree";
import type { Category } from "@/lib/api/categories";

export function CategorySearchForm({ categories }: { categories: Category[] }) {
  const locale = useLocale() as "ka" | "en" | "ru";
  const t = useTranslations("Home");
  const router = useRouter();

  const [categorySlug, setCategorySlug] = useState("");

  const categoryOptions = useMemo(
    () =>
      flattenTree(categories).map((category) => ({
        value: category.slug,
        label: `${"— ".repeat(category.depth)}${category.name[locale]}`,
      })),
    [categories, locale],
  );

  function handleSearch() {
    if (!categorySlug) return;
    router.push(`/${categorySlug}`);
  }

  return (
    <div className="flex w-full max-w-lg flex-col gap-3 rounded-2xl bg-background/95 p-4 shadow-xl backdrop-blur sm:flex-row sm:items-end sm:p-5">
      <div className="flex-1">
        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {t("searchCategoryLabel")}
        </label>
        <Select
          options={categoryOptions}
          value={categorySlug}
          onChange={setCategorySlug}
          searchable
          placeholder={t("searchCategoryPlaceholder")}
        />
      </div>
      <button
        type="button"
        onClick={handleSearch}
        disabled={!categorySlug}
        className="rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover disabled:opacity-50"
      >
        {t("searchButton")}
      </button>
    </div>
  );
}
