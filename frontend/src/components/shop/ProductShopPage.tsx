"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { SelectOption } from "@/components/shared/Select";
import { Pagination, usePagination } from "@/components/shared/Pagination";
import type { Category } from "@/lib/api/categories";
import type { Product } from "@/lib/api/products";
import { ProductFilters, type BrandOption } from "./ProductFilters";
import { ProductCard } from "./ProductCard";
import { ShopHero } from "./ShopHero";
import { ShopToolbar } from "./ShopToolbar";
import { ShopItemGrid } from "./ShopItemGrid";
import type { ViewMode } from "./ViewModeToggle";

type SortBy = "newest" | "price-asc" | "price-desc";

export function ProductShopPage({
  category,
  products,
}: {
  category: Category;
  products: Product[];
}) {
  const locale = useLocale() as "ka" | "en" | "ru";
  const t = useTranslations("Shop");

  const [search, setSearch] = useState("");
  const [selectedBrandIds, setSelectedBrandIds] = useState<number[]>([]);
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [sortBy, setSortBy] = useState<SortBy>("newest");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");

  const brandOptions: BrandOption[] = useMemo(() => {
    const byId = new Map<number, BrandOption>();
    for (const product of products) {
      if (product.productBrand && !byId.has(product.productBrand.id)) {
        byId.set(product.productBrand.id, {
          id: product.productBrand.id,
          label: product.productBrand.name[locale],
        });
      }
    }
    return Array.from(byId.values()).sort((a, b) => a.label.localeCompare(b.label));
  }, [products, locale]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    const min = priceMin ? Number(priceMin) : null;
    const max = priceMax ? Number(priceMax) : null;

    const result = products.filter((product) => {
      if (query && !product.name[locale].toLowerCase().includes(query)) return false;
      if (selectedBrandIds.length > 0) {
        if (!product.productBrand || !selectedBrandIds.includes(product.productBrand.id)) {
          return false;
        }
      }
      if (min != null && (product.minPrice == null || product.minPrice < min)) return false;
      if (max != null && (product.minPrice == null || product.minPrice > max)) return false;
      return true;
    });

    const sorted = [...result];
    if (sortBy === "price-asc") {
      sorted.sort((a, b) => (a.minPrice ?? 0) - (b.minPrice ?? 0));
    } else if (sortBy === "price-desc") {
      sorted.sort((a, b) => (b.minPrice ?? 0) - (a.minPrice ?? 0));
    } else {
      sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    return sorted;
  }, [products, search, selectedBrandIds, priceMin, priceMax, sortBy, locale]);

  const { page, setPage, pageItems, totalPages } = usePagination(filtered, 20);

  function resetToFirstPage() {
    setPage(1);
  }

  const sortOptions: SelectOption[] = [
    { value: "newest", label: t("sortNewest") },
    { value: "price-asc", label: t("sortPriceAsc") },
    { value: "price-desc", label: t("sortPriceDesc") },
  ];

  return (
    <>
      <ShopHero category={category} />
      <div className="border-t border-border bg-muted/40">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-[280px_1fr]">
            <aside className="h-fit rounded-2xl border border-border bg-card p-5 shadow-sm md:sticky md:top-24">
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                {t("filtersHeading")}
              </h2>
              <ProductFilters
                search={search}
                onSearchChange={(value) => {
                  setSearch(value);
                  resetToFirstPage();
                }}
                brandOptions={brandOptions}
                selectedBrandIds={selectedBrandIds}
                onToggleBrand={(brandId) => {
                  setSelectedBrandIds((current) =>
                    current.includes(brandId)
                      ? current.filter((id) => id !== brandId)
                      : [...current, brandId],
                  );
                  resetToFirstPage();
                }}
                priceMin={priceMin}
                priceMax={priceMax}
                onPriceMinChange={(value) => {
                  setPriceMin(value);
                  resetToFirstPage();
                }}
                onPriceMaxChange={(value) => {
                  setPriceMax(value);
                  resetToFirstPage();
                }}
              />
            </aside>

            <div className="flex flex-col gap-6">
              <ShopToolbar
                resultCountLabel={t("resultCount", { count: filtered.length })}
                sortValue={sortBy}
                sortOptions={sortOptions}
                onSortChange={(value) => setSortBy(value as SortBy)}
                viewMode={viewMode}
                onViewModeChange={setViewMode}
                gridLabel={t("viewGrid")}
                listLabel={t("viewList")}
              />

              <ShopItemGrid
                items={pageItems}
                layout={viewMode}
                getKey={(product) => product.id}
                emptyMessage={t("emptyState")}
                renderItem={(product, layout) => <ProductCard product={product} layout={layout} />}
              />

              <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
