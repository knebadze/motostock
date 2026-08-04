"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { usePathname, useRouter } from "@/i18n/navigation";
import type { SelectOption } from "@/components/shared/Select";
import { Pagination, usePagination } from "@/components/shared/Pagination";
import { ApiRequestError } from "@/lib/api/client";
import { listProducts, type Product, type ProductAttributeFilters } from "@/lib/api/products";
import type { Category } from "@/lib/api/categories";
import type { CategoryFilter } from "@/lib/api/category-filters";
import type { GarageVehicle } from "@/lib/api/vehicle-catalog";
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
  filters,
  garageVehicles,
  initialPage = 1,
  initialSort = "newest",
}: {
  category: Category;
  breadcrumbChain: Category[];
  subcategories: Category[];
  products: Product[];
  filters: CategoryFilter[];
  garageVehicles: GarageVehicle[];
  initialPage?: number;
  initialSort?: string;
}) {
  const locale = useLocale() as "ka" | "en" | "ru";
  const t = useTranslations("Shop");
  const pathname = usePathname();
  const router = useRouter();

  const [search, setSearch] = useState("");
  const [selectedBrandIds, setSelectedBrandIds] = useState<number[]>([]);
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [selectedVehicleCatalogId, setSelectedVehicleCatalogId] = useState("");
  const [attributeFilterState, setAttributeFilterState] = useState<Record<number, AttributeFilterState>>(
    {},
  );
  const [sortBy, setSortBy] = useState<SortBy>(() => parseSortBy(initialSort));
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [displayedProducts, setDisplayedProducts] = useState(products);
  const [loading, setLoading] = useState(false);

  // Brand checkboxes always reflect the category's full, unfiltered catalog
  // (not the currently-filtered result) — otherwise checked brands would
  // visually disappear as other filters narrow the list.
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

  function updateAttributeState(attributeId: number, patch: Partial<AttributeFilterState>) {
    setAttributeFilterState((current) => ({
      ...current,
      [attributeId]: { ...(current[attributeId] ?? EMPTY_ATTRIBUTE_STATE), ...patch },
    }));
  }

  function resetToFirstPage() {
    setPage(1);
  }

  function toggleOption(attributeId: number, optionId: number) {
    const existing = attributeFilterState[attributeId] ?? EMPTY_ATTRIBUTE_STATE;
    const optionIds = existing.optionIds.includes(optionId)
      ? existing.optionIds.filter((id) => id !== optionId)
      : [...existing.optionIds, optionId];
    updateAttributeState(attributeId, { optionIds });
    resetToFirstPage();
  }

  function toggleBoolean(attributeId: number) {
    const existing = attributeFilterState[attributeId] ?? EMPTY_ATTRIBUTE_STATE;
    updateAttributeState(attributeId, { booleanEnabled: !existing.booleanEnabled });
    resetToFirstPage();
  }

  function handleNumberRangeChange(attributeId: number, field: "min" | "max", value: string) {
    updateAttributeState(attributeId, field === "min" ? { numberMin: value } : { numberMax: value });
    resetToFirstPage();
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

  // Search/brand/price/attribute filters all move server-side together —
  // any change here refetches (debounced) instead of re-filtering the
  // already-fetched array in memory.
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setLoading(true);
      listProducts({
        categoryId: category.id,
        vehicleCatalogId: selectedVehicleCatalogId ? Number(selectedVehicleCatalogId) : undefined,
        search: search.trim() || undefined,
        brandIds: selectedBrandIds.length > 0 ? selectedBrandIds : undefined,
        priceMin: priceMin.trim() ? Number(priceMin) : undefined,
        priceMax: priceMax.trim() ? Number(priceMax) : undefined,
        attributeFilters,
      })
        .then(setDisplayedProducts)
        .catch((error) => {
          const message =
            error instanceof ApiRequestError ? error.message : "პროდუქტების ჩატვირთვა ვერ მოხერხდა";
          toast.error(message);
        })
        .finally(() => setLoading(false));
    }, FILTER_DEBOUNCE_MS);

    return () => clearTimeout(timeoutId);
  }, [
    category.id,
    search,
    selectedBrandIds,
    priceMin,
    priceMax,
    attributeFilters,
    selectedVehicleCatalogId,
  ]);

  const sorted = useMemo(() => {
    const result = [...displayedProducts];
    if (sortBy === "price-asc") {
      result.sort((a, b) => (a.minPrice ?? 0) - (b.minPrice ?? 0));
    } else if (sortBy === "price-desc") {
      result.sort((a, b) => (b.minPrice ?? 0) - (a.minPrice ?? 0));
    } else {
      result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    return result;
  }, [displayedProducts, sortBy]);

  const { page, setPage, pageItems, totalPages } = usePagination(sorted, 20, initialPage);

  // Keep page/sort in the URL — they change WHICH content is visible, so each
  // combination must be its own crawlable, shareable, bookmarkable address.
  // Search/brand/price/attribute filters stay client-only state (deliberately
  // not synced here — faceted-filter combinations aren't meant to be
  // individually indexed).
  useEffect(() => {
    const query: Record<string, string> = {};
    if (page > 1) query.page = String(page);
    if (sortBy !== "newest") query.sort = sortBy;
    router.replace({ pathname, query }, { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, sortBy]);

  const sortOptions: SelectOption[] = [
    { value: "newest", label: t("sortNewest") },
    { value: "price-asc", label: t("sortPriceAsc") },
    { value: "price-desc", label: t("sortPriceDesc") },
  ];

  return (
    <>
      <ShopHero category={category} breadcrumbChain={breadcrumbChain} />
      <SubcategoryGrid subcategories={subcategories} />
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
                filters={filters}
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
                attributeFilterState={attributeFilterState}
                onToggleOption={toggleOption}
                onToggleBoolean={toggleBoolean}
                onNumberRangeChange={handleNumberRangeChange}
                garageVehicles={garageVehicles}
                selectedVehicleCatalogId={selectedVehicleCatalogId}
                onVehicleChange={(value) => {
                  setSelectedVehicleCatalogId(value);
                  resetToFirstPage();
                }}
              />
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
              />

              <ShopItemGrid
                items={pageItems}
                layout={viewMode}
                getKey={(product) => product.id}
                emptyMessage={t("emptyState")}
                renderItem={(product, layout) => <ProductCard product={product} layout={layout} />}
                loading={loading}
              />

              <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
