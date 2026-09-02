"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { usePathname, useRouter } from "@/i18n/navigation";
import type { SelectOption } from "@/components/shared/Select";
import { Pagination, useServerPagination, type PagedResult } from "@/components/shared/Pagination";
import { FilterDrawer } from "@/components/shared/FilterDrawer";
import { resolveApiErrorMessage } from "@/lib/api-errors";
import { listProductsPage, type Product, type ProductAttributeFilters } from "@/lib/api/products";
import type { Category } from "@/lib/api/categories";
import type { CategoryFilter, CategoryFilterAttribute } from "@/lib/api/category-filters";
import type { GarageVehicle } from "@/lib/api/vehicle-catalog";
import { formatVehicleCatalogLabel } from "@/lib/format";
import { persistSelectedVehicleCookie } from "@/lib/vehicle-selection";
import { ActiveFilterTags, type ActiveFilterTag } from "./ActiveFilterTags";
import { ProductFilters, type AttributeFilterState, type BrandOption } from "./ProductFilters";
import { ProductCard } from "./ProductCard";
import { ShopHero } from "./ShopHero";
import { SubcategoryGrid } from "./SubcategoryGrid";
import { ShopToolbar } from "./ShopToolbar";
import { ShopItemGrid } from "./ShopItemGrid";
import type { ViewMode } from "./ViewModeToggle";

type SortBy = "newest" | "price-asc" | "price-desc";
const SORT_VALUES: SortBy[] = ["newest", "price-asc", "price-desc"];
const FILTER_DEBOUNCE_MS = 350;

function parseSortBy(value: string): SortBy {
  return (SORT_VALUES as string[]).includes(value) ? (value as SortBy) : "newest";
}

const EMPTY_ATTRIBUTE_STATE: AttributeFilterState = {
  optionIds: [],
  booleanEnabled: false,
  numberMin: "",
  numberMax: "",
};

export function ProductShopPage({
  category,
  breadcrumbChain,
  subcategories,
  products,
  initialData,
  filters,
  garageVehicles,
  initialSort = "newest",
}: {
  category: Category;
  breadcrumbChain: Category[];
  subcategories: Category[];
  // Unbounded — feeds the brand-checkbox facet list, which needs to see
  // every brand present in the category, not just the current page's.
  products: Product[];
  // Real server pagination — feeds the actual grid.
  initialData: PagedResult<Product>;
  filters: CategoryFilter[];
  garageVehicles: GarageVehicle[];
  initialSort?: string;
}) {
  const locale = useLocale() as "ka" | "en" | "ru";
  const t = useTranslations("Shop");
  const tCommon = useTranslations("Common");
  const tErrors = useTranslations("ApiErrors");
  const pathname = usePathname();
  const router = useRouter();

  const [search, setSearch] = useState("");
  const [selectedBrandIds, setSelectedBrandIds] = useState<number[]>([]);
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  // Never seeded from the garage/session vehicle cookie — the MY_VEHICLE
  // filter only takes effect once the shopper explicitly picks it here.
  const [selectedVehicleCatalogId, setSelectedVehicleCatalogId] = useState("");
  const [attributeFilterState, setAttributeFilterState] = useState<Record<number, AttributeFilterState>>(
    {},
  );
  const [sortBy, setSortBy] = useState<SortBy>(() => parseSortBy(initialSort));
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const { data, totalPages, loading, load } = useServerPagination(initialData);
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);

  // Brand checkboxes always reflect the category's full, unfiltered catalog
  // (not the currently-filtered result) — otherwise checked brands would
  // visually disappear as other filters narrow the list.
  const brandOptions: BrandOption[] = useMemo(() => {
    const byId = new Map<number, BrandOption>();
    for (const product of products) {
      if (product.productBrand && !byId.has(product.productBrand.id)) {
        byId.set(product.productBrand.id, {
          id: product.productBrand.id,
          label: product.productBrand.name,
        });
      }
    }
    return Array.from(byId.values()).sort((a, b) => a.label.localeCompare(b.label));
  }, [products]);

  function updateAttributeState(attributeId: number, patch: Partial<AttributeFilterState>) {
    setAttributeFilterState((current) => ({
      ...current,
      [attributeId]: { ...(current[attributeId] ?? EMPTY_ATTRIBUTE_STATE), ...patch },
    }));
  }

  function toggleOption(attributeId: number, optionId: number) {
    const existing = attributeFilterState[attributeId] ?? EMPTY_ATTRIBUTE_STATE;
    const optionIds = existing.optionIds.includes(optionId)
      ? existing.optionIds.filter((id) => id !== optionId)
      : [...existing.optionIds, optionId];
    updateAttributeState(attributeId, { optionIds });
  }

  function toggleBoolean(attributeId: number) {
    const existing = attributeFilterState[attributeId] ?? EMPTY_ATTRIBUTE_STATE;
    updateAttributeState(attributeId, { booleanEnabled: !existing.booleanEnabled });
  }

  function handleNumberRangeChange(attributeId: number, field: "min" | "max", value: string) {
    updateAttributeState(attributeId, field === "min" ? { numberMin: value } : { numberMax: value });
  }

  const attributeFilters: ProductAttributeFilters = useMemo(() => {
    const selectFilters: { attributeId: number; optionIds: number[] }[] = [];
    const booleanAttributeIds: number[] = [];
    const numberRanges: { attributeId: number; min?: number; max?: number }[] = [];

    for (const [attributeIdText, state] of Object.entries(attributeFilterState)) {
      const attributeId = Number(attributeIdText);
      if (state.optionIds.length > 0) selectFilters.push({ attributeId, optionIds: state.optionIds });
      if (state.booleanEnabled) booleanAttributeIds.push(attributeId);
      const min = state.numberMin.trim() ? Number(state.numberMin) : undefined;
      const max = state.numberMax.trim() ? Number(state.numberMax) : undefined;
      if (min != null || max != null) numberRanges.push({ attributeId, min, max });
    }

    return { selectFilters, booleanAttributeIds, numberRanges };
  }, [attributeFilterState]);

  function fetchPage(page: number) {
    return load(
      () =>
        listProductsPage({
          categoryId: category.id,
          vehicleCatalogId: selectedVehicleCatalogId ? Number(selectedVehicleCatalogId) : undefined,
          search: search.trim() || undefined,
          brandIds: selectedBrandIds.length > 0 ? selectedBrandIds : undefined,
          priceMin: priceMin.trim() ? Number(priceMin) : undefined,
          priceMax: priceMax.trim() ? Number(priceMax) : undefined,
          attributeFilters,
          page,
          pageSize: data.pageSize,
          sortBy,
        }),
      (error) => toast.error(resolveApiErrorMessage(error, tErrors, t("loadProductsError"))),
    );
  }

  // Search/brand/price/attribute/sort filters all move server-side together
  // (page/sort/pagination too — see listProductsPage) — any change here
  // refetches (debounced) page 1 instead of re-filtering/re-sorting an
  // already-fetched array in the browser.
  useEffect(() => {
    const timeoutId = setTimeout(() => fetchPage(1), FILTER_DEBOUNCE_MS);
    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    category.id,
    search,
    selectedBrandIds,
    priceMin,
    priceMax,
    attributeFilters,
    selectedVehicleCatalogId,
    sortBy,
  ]);

  // Keep page/sort in the URL — they change WHICH content is visible, so each
  // combination must be its own crawlable, shareable, bookmarkable address.
  // Search/brand/price/attribute filters stay client-only state (deliberately
  // not synced here — faceted-filter combinations aren't meant to be
  // individually indexed).
  useEffect(() => {
    const query: Record<string, string> = {};
    if (data.page > 1) query.page = String(data.page);
    if (sortBy !== "newest") query.sort = sortBy;
    router.replace({ pathname, query }, { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.page, sortBy]);

  const sortOptions: SelectOption[] = [
    { value: "newest", label: t("sortNewest") },
    { value: "price-asc", label: t("sortPriceAsc") },
    { value: "price-desc", label: t("sortPriceDesc") },
  ];

  const attributesById = useMemo(() => {
    const map = new Map<number, CategoryFilterAttribute>();
    for (const filter of filters) {
      if (filter.attribute) map.set(filter.attribute.id, filter.attribute);
    }
    return map;
  }, [filters]);

  const activeTags: ActiveFilterTag[] = useMemo(() => {
    const tags: ActiveFilterTag[] = [];

    if (search.trim()) {
      tags.push({ key: "search", label: search.trim(), onRemove: () => setSearch("") });
    }

    for (const brandId of selectedBrandIds) {
      const brand = brandOptions.find((option) => option.id === brandId);
      if (brand) {
        tags.push({
          key: `brand-${brandId}`,
          label: brand.label,
          onRemove: () => {
            setSelectedBrandIds((current) => current.filter((id) => id !== brandId));
          },
        });
      }
    }

    if (priceMin.trim() || priceMax.trim()) {
      tags.push({
        key: "price",
        label: `${t("priceFilterLabel")}: ${priceMin || "?"}–${priceMax || "?"}`,
        onRemove: () => {
          setPriceMin("");
          setPriceMax("");
        },
      });
    }

    if (selectedVehicleCatalogId) {
      const vehicle = garageVehicles.find(
        (item) => String(item.vehicleCatalog.id) === selectedVehicleCatalogId,
      );
      if (vehicle) {
        tags.push({
          key: "vehicle",
          label: formatVehicleCatalogLabel(vehicle.vehicleCatalog),
          onRemove: () => {
            setSelectedVehicleCatalogId("");
            persistSelectedVehicleCookie("");
          },
        });
      }
    }

    for (const [attributeIdText, state] of Object.entries(attributeFilterState)) {
      const attributeId = Number(attributeIdText);
      const attribute = attributesById.get(attributeId);
      if (!attribute) continue;

      for (const optionId of state.optionIds) {
        const option = attribute.options.find((item) => item.id === optionId);
        if (!option) continue;
        tags.push({
          key: `attr-${attributeId}-opt-${optionId}`,
          label: option.label[locale],
          onRemove: () => toggleOption(attributeId, optionId),
        });
      }

      if (state.booleanEnabled) {
        tags.push({
          key: `attr-${attributeId}-bool`,
          label: attribute.name[locale],
          onRemove: () => toggleBoolean(attributeId),
        });
      }

      if (state.numberMin.trim() || state.numberMax.trim()) {
        tags.push({
          key: `attr-${attributeId}-range`,
          label: `${attribute.name[locale]}: ${state.numberMin || "?"}–${state.numberMax || "?"}`,
          onRemove: () => {
            updateAttributeState(attributeId, { numberMin: "", numberMax: "" });
          },
        });
      }
    }

    return tags;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    search,
    selectedBrandIds,
    brandOptions,
    priceMin,
    priceMax,
    selectedVehicleCatalogId,
    garageVehicles,
    locale,
    attributeFilterState,
    attributesById,
  ]);

  function handleClearAllFilters() {
    setSearch("");
    setSelectedBrandIds([]);
    setPriceMin("");
    setPriceMax("");
    setSelectedVehicleCatalogId("");
    persistSelectedVehicleCookie("");
    setAttributeFilterState({});
  }

  // Rendered twice below (desktop <aside>, mobile FilterDrawer) — kept as
  // one node so the two never drift out of sync.
  const filterFields = (
    <div className="flex flex-col gap-6">
      <ActiveFilterTags
        tags={activeTags}
        onClearAll={handleClearAllFilters}
        clearAllLabel={t("clearFiltersLabel")}
      />
      <ProductFilters
        search={search}
        onSearchChange={(value) => {
          setSearch(value);
        }}
        filters={filters}
        brandOptions={brandOptions}
        selectedBrandIds={selectedBrandIds}
        onToggleBrand={(brandId) => {
          setSelectedBrandIds((current) =>
            current.includes(brandId) ? current.filter((id) => id !== brandId) : [...current, brandId],
          );
        }}
        priceMin={priceMin}
        priceMax={priceMax}
        onPriceMinChange={(value) => {
          setPriceMin(value);
        }}
        onPriceMaxChange={(value) => {
          setPriceMax(value);
        }}
        attributeFilterState={attributeFilterState}
        onToggleOption={toggleOption}
        onToggleBoolean={toggleBoolean}
        onNumberRangeChange={handleNumberRangeChange}
        garageVehicles={garageVehicles}
        selectedVehicleCatalogId={selectedVehicleCatalogId}
        onVehicleChange={(value) => {
          setSelectedVehicleCatalogId(value);
          persistSelectedVehicleCookie(value);
        }}
      />
    </div>
  );

  return (
    <>
      <ShopHero category={category} breadcrumbChain={breadcrumbChain} />
      <SubcategoryGrid subcategories={subcategories} />
      <div className="border-t border-border bg-muted/40">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-[280px_1fr]">
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
