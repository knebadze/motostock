"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { Pagination, useServerPagination, type PagedResult } from "@/components/shared/Pagination";
import { Select, type SelectOption } from "@/components/shared/Select";
import { FilterDrawer } from "@/components/shared/FilterDrawer";
import { Link } from "@/i18n/navigation";
import { ActiveFilterTags, type ActiveFilterTag } from "./ActiveFilterTags";
import { ShopToolbar } from "./ShopToolbar";
import { ShopItemGrid } from "./ShopItemGrid";
import { ProductCard } from "./ProductCard";
import type { ViewMode } from "./ViewModeToggle";
import { listProductsPage, type Product } from "@/lib/api/products";
import type { GarageVehicle } from "@/lib/api/vehicle-catalog";
import { resolveApiErrorMessage } from "@/lib/api-errors";
import { formatVehicleCatalogLabel } from "@/lib/format";

type SortBy = "newest" | "price-asc" | "price-desc";
const SORT_VALUES: SortBy[] = ["newest", "price-asc", "price-desc"];
const FILTER_DEBOUNCE_MS = 350;

function parseSortBy(value: string): SortBy {
  return (SORT_VALUES as string[]).includes(value) ? (value as SortBy) : "newest";
}

// One general "browse everything" page (not tied to a single category, which
// keeps its own dedicated /{categorySlug} route+URL for SEO) — used for
// cross-category discovery: sale (?onSale=true), search, or just "see
// everything". Search/category-checkbox/vehicle/sort filters all move
// server-side together (see listProductsPage) — any change refetches
// (debounced) page 1, same pattern as ProductShopPage.tsx.
export function ShopAllProductsPage({
  products,
  initialData,
  garageVehicles,
  initialOnSale,
  initialCategoryId,
  initialBrandIds,
}: {
  // Unbounded — feeds the category-checkbox facet list, which needs to see
  // every category present, not just the current page's.
  products: Product[];
  // Real server pagination — feeds the actual grid.
  initialData: PagedResult<Product>;
  garageVehicles: GarageVehicle[];
  initialOnSale: boolean;
  initialCategoryId?: number;
  initialBrandIds?: number[];
}) {
  const locale = useLocale() as "ka" | "en" | "ru";
  const t = useTranslations("Shop");
  const tCommon = useTranslations("Common");
  const tErrors = useTranslations("ApiErrors");
  const myVehicleSelectId = useId();
  const [vehicleCatalogId, setVehicleCatalogId] = useState("");
  const [search, setSearch] = useState("");
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<number[]>([]);
  const [sortBy, setSortBy] = useState<SortBy>(() => parseSortBy("newest"));
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const { data, totalPages, loading, load } = useServerPagination(initialData);
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);

  function fetchPage(page: number) {
    return load(
      () =>
        listProductsPage({
          // Once a category checkbox is picked, it takes over from the
          // fixed initialCategoryId entirely (see categoryIds' schema
          // comment — the two are mutually exclusive server-side).
          categoryId: selectedCategoryIds.length === 0 ? initialCategoryId : undefined,
          categoryIds: selectedCategoryIds.length > 0 ? selectedCategoryIds : undefined,
          vehicleCatalogId: vehicleCatalogId ? Number(vehicleCatalogId) : undefined,
          brandIds: initialBrandIds,
          onSale: initialOnSale || undefined,
          search: search.trim() || undefined,
          page,
          pageSize: data.pageSize,
          sortBy,
        }),
      (error) => toast.error(resolveApiErrorMessage(error, tErrors, t("loadProductsError"))),
    );
  }

  useEffect(() => {
    const timeoutId = setTimeout(() => fetchPage(1), FILTER_DEBOUNCE_MS);
    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, selectedCategoryIds, vehicleCatalogId, sortBy]);

  function handleVehicleChange(value: string) {
    setVehicleCatalogId(value);
    setSelectedCategoryIds([]);
  }

  const vehicleOptions: SelectOption[] = [
    { value: "", label: t("myVehicleAllOption") },
    ...garageVehicles.map((vehicle) => ({
      value: String(vehicle.vehicleCatalog.id),
      label: formatVehicleCatalogLabel(vehicle.vehicleCatalog),
    })),
  ];

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
    if (vehicleCatalogId) {
      const vehicle = garageVehicles.find(
        (item) => String(item.vehicleCatalog.id) === vehicleCatalogId,
      );
      if (vehicle) {
        tags.push({
          key: "vehicle",
          label: formatVehicleCatalogLabel(vehicle.vehicleCatalog),
          onRemove: () => handleVehicleChange(""),
        });
      }
    }
    for (const categoryId of selectedCategoryIds) {
      const category = categoryOptions.find((item) => item.id === categoryId);
      if (category) {
        tags.push({
          key: `category-${categoryId}`,
          label: category.name[locale],
          onRemove: () => toggleCategory(categoryId),
        });
      }
    }
    return tags;
  }, [search, vehicleCatalogId, garageVehicles, locale, selectedCategoryIds, categoryOptions]);

  function handleClearAllFilters() {
    setSearch("");
    setSelectedCategoryIds([]);
    setVehicleCatalogId("");
  }

  // Rendered twice below (desktop <aside>, mobile FilterDrawer) — kept as
  // one node so the two never drift out of sync.
  const filterFields = (
    <div className="flex flex-col gap-6">
      <ActiveFilterTags tags={activeTags} onClearAll={handleClearAllFilters} clearAllLabel={t("clearFiltersLabel")} />

      <input
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder={t("searchPlaceholder")}
        className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
      />

      {garageVehicles.length > 0 ? (
        <div className="flex flex-col gap-2">
          <label htmlFor={myVehicleSelectId} className="text-sm font-medium">
            {t("myVehicleFilterLabel")}
          </label>
          <Select
            id={myVehicleSelectId}
            options={vehicleOptions}
            value={vehicleCatalogId}
            onChange={handleVehicleChange}
            searchable
            placeholder={t("myVehiclePlaceholder")}
            searchPlaceholder={tCommon("select.search")}
            emptyLabel={tCommon("select.empty")}
          />
        </div>
      ) : (
        // Covers both "not logged in" and "empty garage" — garageVehicles is
        // always [] for a guest (see getMyGarageFromServer); clicking through
        // lands on /account/garage, which itself redirects to /login when needed.
        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium">{t("myVehicleFilterLabel")}</span>
          <p className="text-sm text-muted-foreground">{t("myVehicleEmptyMessage")}</p>
          <Link
            href="/account/garage"
            className="self-start rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary-hover"
          >
            {t("myVehicleAddButton")}
          </Link>
        </div>
      )}

      {categoryOptions.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium">{t("categoryFilterLabel")}</span>
          <div className="flex flex-col gap-1.5">
            {categoryOptions.map((category) => (
              <label key={category.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={selectedCategoryIds.includes(category.id)}
                  onChange={() => toggleCategory(category.id)}
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
            {initialOnSale ? t("saleHeading") : t("shopHeading")}
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
                resultCountLabel={t("resultCount", { count: data.total })}
                sortLabel={t("sortLabel")}
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
                items={data.items}
                layout={viewMode}
                getKey={(product) => product.id}
                emptyMessage={t("emptyState")}
                renderItem={(product, layout) => <ProductCard product={product} layout={layout} />}
                loading={loading}
              />

              <Pagination
                currentPage={data.page}
                totalPages={totalPages}
                onPageChange={fetchPage}
                navLabel={tCommon("pagination.nav")}
                prevLabel={tCommon("pagination.prev")}
                nextLabel={tCommon("pagination.next")}
              />
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
