"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Pagination, usePagination } from "@/components/shared/Pagination";
import type { SelectOption } from "@/components/shared/Select";
import { FilterDrawer } from "@/components/shared/FilterDrawer";
import { ActiveFilterTags, type ActiveFilterTag } from "./ActiveFilterTags";
import { ShopToolbar } from "./ShopToolbar";
import { ShopItemGrid } from "./ShopItemGrid";
import { ProductCard } from "./ProductCard";
import type { ViewMode } from "./ViewModeToggle";
import type { Product } from "@/lib/api/products";
import type { VehicleCatalogEntry } from "@/lib/api/vehicle-catalog";
import { formatVehicleCatalogLabel } from "@/lib/format";
import { persistSelectedVehicleCookie } from "@/lib/vehicle-selection";

type SortBy = "newest" | "price-asc" | "price-desc";
const SORT_VALUES: SortBy[] = ["newest", "price-asc", "price-desc"];

function parseSortBy(value: string): SortBy {
  return (SORT_VALUES as string[]).includes(value) ? (value as SortBy) : "newest";
}

export function CompatibleProductsPage({
  vehicle,
  products,
}: {
  vehicle: VehicleCatalogEntry;
  products: Product[];
}) {
  const locale = useLocale() as "ka" | "en" | "ru";
  const t = useTranslations("Shop");
  const [search, setSearch] = useState("");
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<number[]>([]);
  const [sortBy, setSortBy] = useState<SortBy>(() => parseSortBy("newest"));
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);

  // Visiting this page is an explicit "show me stuff for this vehicle"
  // signal — persist it the same way the shop's "my vehicle" filter does,
  // so clicking into a product from here also carries the vehicle context
  // (e.g. for buyTogether filtering on the product detail page). A plain
  // cookie write, not React state, so this doesn't trip the
  // setState-in-effect rule.
  useEffect(() => {
    persistSelectedVehicleCookie(String(vehicle.id));
  }, [vehicle.id]);

  // The compatible set for one vehicle is inherently bounded (a handful of
  // fitted products, not the whole catalog), so — unlike the per-category
  // shop page — search/category filtering here narrows the already-fetched
  // list client-side instead of round-tripping to the server per keystroke.
  const categoryOptions = useMemo(() => {
    const byId = new Map<number, Product["category"]>();
    for (const product of products) {
      if (!byId.has(product.category.id)) byId.set(product.category.id, product.category);
    }
    return Array.from(byId.values()).sort((a, b) =>
      a.name[locale].localeCompare(b.name[locale]),
    );
  }, [products, locale]);

  function toggleCategory(categoryId: number) {
    setSelectedCategoryIds((current) =>
      current.includes(categoryId)
        ? current.filter((id) => id !== categoryId)
        : [...current, categoryId],
    );
  }

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return products.filter((product) => {
      if (selectedCategoryIds.length > 0 && !selectedCategoryIds.includes(product.category.id)) {
        return false;
      }
      if (query && !product.name[locale].toLowerCase().includes(query)) return false;
      return true;
    });
  }, [products, selectedCategoryIds, search, locale]);

  const sorted = useMemo(() => {
    const result = [...filtered];
    if (sortBy === "price-asc") {
      result.sort((a, b) => (a.minPrice ?? 0) - (b.minPrice ?? 0));
    } else if (sortBy === "price-desc") {
      result.sort((a, b) => (b.minPrice ?? 0) - (a.minPrice ?? 0));
    } else {
      result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    return result;
  }, [filtered, sortBy]);

  const { page, setPage, pageItems, totalPages } = usePagination(sorted);

  const sortOptions: SelectOption[] = [
    { value: "newest", label: t("sortNewest") },
    { value: "price-asc", label: t("sortPriceAsc") },
    { value: "price-desc", label: t("sortPriceDesc") },
  ];

  const activeTags: ActiveFilterTag[] = useMemo(() => {
    const tags: ActiveFilterTag[] = [];
    if (search.trim()) {
      tags.push({ key: "search", label: search.trim(), onRemove: () => setSearch("") });
    }
    for (const categoryId of selectedCategoryIds) {
      const category = categoryOptions.find((item) => item.id === categoryId);
      if (category) {
        tags.push({
          key: `category-${categoryId}`,
          label: category.name[locale],
          onRemove: () => {
            toggleCategory(categoryId);
            setPage(1);
          },
        });
      }
    }
    return tags;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, selectedCategoryIds, categoryOptions, locale]);

  function handleClearAllFilters() {
    setSearch("");
    setSelectedCategoryIds([]);
    setPage(1);
  }

  // Rendered twice below (desktop <aside>, mobile FilterDrawer) — kept as
  // one node so the two never drift out of sync.
  const filterFields = (
    <div className="flex flex-col gap-6">
      <ActiveFilterTags tags={activeTags} onClearAll={handleClearAllFilters} clearAllLabel={t("clearFiltersLabel")} />

      <input
        value={search}
        onChange={(event) => {
          setSearch(event.target.value);
          setPage(1);
        }}
        placeholder={t("searchPlaceholder")}
        className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
      />

      {categoryOptions.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium">{t("categoryFilterLabel")}</span>
          <div className="flex flex-col gap-1.5">
            {categoryOptions.map((category) => (
              <label key={category.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={selectedCategoryIds.includes(category.id)}
                  onChange={() => {
                    toggleCategory(category.id);
                    setPage(1);
                  }}
                  className="size-4 rounded border-border accent-primary"
                />
                {category.name[locale]}
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <>
      <div className="border-t border-border bg-muted/40">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
          <h1 className="text-2xl font-bold tracking-tight">
            {t("compatibleProductsHeading", { vehicle: formatVehicleCatalogLabel(vehicle, locale) })}
          </h1>

          <div className="mt-8 grid grid-cols-1 gap-8 md:grid-cols-[280px_1fr]">
            <aside className="hidden h-fit rounded-2xl border border-border bg-card p-5 shadow-sm md:block md:sticky md:top-24">
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                {t("filtersHeading")}
              </h2>
              {filterFields}
            </aside>

            <div className="flex flex-col gap-6">
              <ShopToolbar
                resultCountLabel={t("resultCount", { count: sorted.length })}
                sortValue={sortBy}
                sortOptions={sortOptions}
                onSortChange={(value) => setSortBy(value as SortBy)}
                viewMode={viewMode}
                onViewModeChange={setViewMode}
                gridLabel={t("viewGrid")}
                listLabel={t("viewList")}
                filterButtonLabel={t("filtersHeading")}
                onFilterClick={() => setFilterDrawerOpen(true)}
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

      <FilterDrawer
        open={filterDrawerOpen}
        onClose={() => setFilterDrawerOpen(false)}
        title={t("filtersHeading")}
      >
        {filterFields}
      </FilterDrawer>
    </>
  );
}
