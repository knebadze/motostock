"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { Pagination, useServerPagination, type PagedResult } from "@/components/shared/Pagination";
import type { SelectOption } from "@/components/shared/Select";
import { FilterDrawer } from "@/components/shared/FilterDrawer";
import { ActiveFilterTags, type ActiveFilterTag } from "./ActiveFilterTags";
import { ShopToolbar } from "./ShopToolbar";
import { ShopItemGrid } from "./ShopItemGrid";
import { ProductCard } from "./ProductCard";
import type { ViewMode } from "./ViewModeToggle";
import { listProductsPage, type ProductListItem } from "@/lib/api/products";
import type { NamedRef, VehicleCatalogEntry } from "@/lib/api/vehicle-catalog";
import { resolveApiErrorMessage } from "@/lib/api-errors";
import { formatVehicleCatalogLabel } from "@/lib/format";
import { persistSelectedVehicleCookie } from "@/lib/vehicle-selection";
import { getWishlistStatus } from "@/lib/api/wishlist";
import { getCompareStatus } from "@/lib/api/compare";
import { shouldCheckWishlistStatus, shouldCheckCompareStatus } from "@/lib/api/collection-status-gate";
import { useCollectionStatusMap, lookupProductStatus } from "@/components/shared/useCollectionStatusMap";

type SortBy = "newest" | "price-asc" | "price-desc";
const SORT_VALUES: SortBy[] = ["newest", "price-asc", "price-desc"];
const FILTER_DEBOUNCE_MS = 350;

function parseSortBy(value: string): SortBy {
  return (SORT_VALUES as string[]).includes(value) ? (value as SortBy) : "newest";
}

// Server-paginated like the /shop page (ShopAllProductsPage.tsx): one page
// of compatible products at a time, search/category/sort applied server-side.
// It used to receive the WHOLE compatible set and filter/sort/paginate it in
// the browser — for a vehicle covered by broad CATEGORY/ALL fitment rules,
// most of the catalog inlined into this (indexed, sitemap-listed) page.
export function CompatibleProductsPage({
  vehicle,
  initialData,
  categories,
}: {
  vehicle: VehicleCatalogEntry;
  initialData: PagedResult<ProductListItem>;
  categories: NamedRef[];
}) {
  const locale = useLocale() as "ka" | "en" | "ru";
  const t = useTranslations("Shop");
  const tCommon = useTranslations("Common");
  const tErrors = useTranslations("ApiErrors");
  const { data, totalPages, loading, load } = useServerPagination(initialData);
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

  // Only categories that have products fitting this vehicle (server facet).
  const categoryOptions = useMemo(
    () => [...categories].sort((a, b) => a.name[locale].localeCompare(b.name[locale])),
    [categories, locale],
  );

  function fetchPage(page: number) {
    return load(
      () =>
        listProductsPage({
          vehicleCatalogId: vehicle.id,
          categoryIds: selectedCategoryIds.length > 0 ? selectedCategoryIds : undefined,
          search: search.trim() || undefined,
          page,
          pageSize: data.pageSize,
          sortBy,
        }),
      (error) => toast.error(resolveApiErrorMessage(error, tErrors, t("loadProductsError"))),
    );
  }

  // Skips its first run (initialData is already page 1, newest) — same guard
  // as the other shop pages. Debounced for typing in the search box.
  const skippedFirstFilterRun = useRef(false);
  useEffect(() => {
    if (!skippedFirstFilterRun.current) {
      skippedFirstFilterRun.current = true;
      return;
    }
    const timeoutId = setTimeout(() => fetchPage(1), FILTER_DEBOUNCE_MS);
    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, selectedCategoryIds, sortBy]);

  function toggleCategory(categoryId: number) {
    setSelectedCategoryIds((current) =>
      current.includes(categoryId)
        ? current.filter((id) => id !== categoryId)
        : [...current, categoryId],
    );
  }

  // One batched wishlist/compare status check for the current page's grid
  // instead of each ProductCard's own WishlistButton/CompareButton checking
  // individually — see useCollectionStatusMap's own comment.
  const visibleProductIds = useMemo(() => data.items.map((product) => product.id), [data.items]);
  const wishlistStatus = useCollectionStatusMap(
    getWishlistStatus,
    visibleProductIds,
    [],
    shouldCheckWishlistStatus,
  );
  const compareStatus = useCollectionStatusMap(getCompareStatus, visibleProductIds, [], shouldCheckCompareStatus);

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
          onRemove: () => toggleCategory(categoryId),
        });
      }
    }
    return tags;
  }, [search, selectedCategoryIds, categoryOptions, locale]);

  function handleClearAllFilters() {
    setSearch("");
    setSelectedCategoryIds([]);
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
            {t("compatibleProductsHeading", { vehicle: formatVehicleCatalogLabel(vehicle) })}
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
                renderItem={(product, layout) => (
                  <ProductCard
                    product={product}
                    layout={layout}
                    wishlistItemId={lookupProductStatus(wishlistStatus, product.id)}
                    compareItemId={lookupProductStatus(compareStatus, product.id)}
                  />
                )}
                loading={loading}
              />

              <Pagination
                currentPage={data.page}
                totalPages={totalPages}
                onPageChange={(nextPage) => void fetchPage(nextPage)}
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
