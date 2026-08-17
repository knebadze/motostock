"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { usePathname, useRouter } from "@/i18n/navigation";
import type { SelectOption } from "@/components/shared/Select";
import { Pagination, usePagination } from "@/components/shared/Pagination";
import { FilterDrawer } from "@/components/shared/FilterDrawer";
import { ApiRequestError } from "@/lib/api/client";
import type { Category } from "@/lib/api/categories";
import {
  listVehicleListings,
  type VehicleListing,
  type VehicleSpecFilters,
} from "@/lib/api/vehicle-listings";
import type { VehicleCategoryFilter, VehicleSpecField } from "@/lib/api/vehicle-category-filters";
import { ActiveFilterTags, type ActiveFilterTag } from "./ActiveFilterTags";
import { VehicleFilters, type SpecFilterState } from "./VehicleFilters";
import type { BrandOption } from "./ProductFilters";
import { VehicleListingCard } from "./VehicleListingCard";
import { ShopHero } from "./ShopHero";
import { SubcategoryGrid } from "./SubcategoryGrid";
import { ShopToolbar } from "./ShopToolbar";
import { ShopItemGrid } from "./ShopItemGrid";
import type { ViewMode } from "./ViewModeToggle";

type SortBy = "newest" | "price-asc" | "price-desc" | "year-desc";
const SORT_VALUES: SortBy[] = ["newest", "price-asc", "price-desc", "year-desc"];
const FILTER_DEBOUNCE_MS = 350;

function parseSortBy(value: string): SortBy {
  return (SORT_VALUES as string[]).includes(value) ? (value as SortBy) : "newest";
}

function effectivePrice(listing: VehicleListing): number {
  return listing.activeDiscount?.discountPrice ?? listing.price;
}

const EMPTY_SPEC_STATE: SpecFilterState = {
  optionIds: [],
  booleanEnabled: false,
  numberMin: "",
  numberMax: "",
};

export function VehicleShopPage({
  category,
  breadcrumbChain,
  subcategories,
  listings,
  filters,
  initialPage = 1,
  initialSort = "newest",
}: {
  category: Category;
  breadcrumbChain: Category[];
  subcategories: Category[];
  listings: VehicleListing[];
  filters: VehicleCategoryFilter[];
  initialPage?: number;
  initialSort?: string;
}) {
  const locale = useLocale() as "ka" | "en" | "ru";
  const t = useTranslations("Shop");
  const pathname = usePathname();
  const router = useRouter();

  const [search, setSearch] = useState("");
  const [selectedBrandIds, setSelectedBrandIds] = useState<number[]>([]);
  const [yearMin, setYearMin] = useState("");
  const [yearMax, setYearMax] = useState("");
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [specFilterState, setSpecFilterState] = useState<
    Partial<Record<VehicleSpecField, SpecFilterState>>
  >({});
  const [sortBy, setSortBy] = useState<SortBy>(() => parseSortBy(initialSort));
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [displayedListings, setDisplayedListings] = useState(listings);
  const [loading, setLoading] = useState(false);
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);

  // Brand checkboxes always reflect the category's full, unfiltered catalog
  // (not the currently-filtered result) — otherwise checked brands would
  // visually disappear as other filters narrow the list.
  const brandOptions: BrandOption[] = useMemo(() => {
    const byId = new Map<number, BrandOption>();
    for (const listing of listings) {
      const brand = listing.vehicleCatalog.brand;
      if (!byId.has(brand.id)) {
        byId.set(brand.id, { id: brand.id, label: brand.name[locale] });
      }
    }
    return Array.from(byId.values()).sort((a, b) => a.label.localeCompare(b.label));
  }, [listings, locale]);

  function resetToFirstPage() {
    setPage(1);
  }

  function updateSpecState(field: VehicleSpecField, patch: Partial<SpecFilterState>) {
    setSpecFilterState((current) => ({
      ...current,
      [field]: { ...(current[field] ?? EMPTY_SPEC_STATE), ...patch },
    }));
  }

  function toggleSpecOption(field: VehicleSpecField, optionId: number) {
    const existing = specFilterState[field] ?? EMPTY_SPEC_STATE;
    const optionIds = existing.optionIds.includes(optionId)
      ? existing.optionIds.filter((id) => id !== optionId)
      : [...existing.optionIds, optionId];
    updateSpecState(field, { optionIds });
    resetToFirstPage();
  }

  function toggleSpecBoolean(field: VehicleSpecField) {
    const existing = specFilterState[field] ?? EMPTY_SPEC_STATE;
    updateSpecState(field, { booleanEnabled: !existing.booleanEnabled });
    resetToFirstPage();
  }

  function handleSpecNumberRangeChange(field: VehicleSpecField, part: "min" | "max", value: string) {
    updateSpecState(field, part === "min" ? { numberMin: value } : { numberMax: value });
    resetToFirstPage();
  }

  const specFilters: VehicleSpecFilters = useMemo(() => {
    const lookupFilters: { field: VehicleSpecField; ids: number[] }[] = [];
    const numberRanges: { field: VehicleSpecField; min?: number; max?: number }[] = [];
    const booleanFields: VehicleSpecField[] = [];

    for (const [fieldText, state] of Object.entries(specFilterState)) {
      const field = fieldText as VehicleSpecField;
      if (state.optionIds.length > 0) lookupFilters.push({ field, ids: state.optionIds });
      if (state.booleanEnabled) booleanFields.push(field);
      const min = state.numberMin.trim() ? Number(state.numberMin) : undefined;
      const max = state.numberMax.trim() ? Number(state.numberMax) : undefined;
      if (min != null || max != null) numberRanges.push({ field, min, max });
    }

    return { lookupFilters, numberRanges, booleanFields };
  }, [specFilterState]);

  // Search/brand/year/price/spec filters all move server-side together —
  // any change here refetches (debounced) instead of re-filtering the
  // already-fetched array in memory (the category can hold far more rows
  // than the 20 shown per page).
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setLoading(true);
      listVehicleListings({
        categoryId: category.id,
        search: search.trim() || undefined,
        brandIds: selectedBrandIds.length > 0 ? selectedBrandIds : undefined,
        yearMin: yearMin.trim() ? Number(yearMin) : undefined,
        yearMax: yearMax.trim() ? Number(yearMax) : undefined,
        priceMin: priceMin.trim() ? Number(priceMin) : undefined,
        priceMax: priceMax.trim() ? Number(priceMax) : undefined,
        specFilters,
      })
        .then(setDisplayedListings)
        .catch((error) => {
          const message =
            error instanceof ApiRequestError ? error.message : "ტექნიკის ჩატვირთვა ვერ მოხერხდა";
          toast.error(message);
        })
        .finally(() => setLoading(false));
    }, FILTER_DEBOUNCE_MS);

    return () => clearTimeout(timeoutId);
  }, [category.id, search, selectedBrandIds, yearMin, yearMax, priceMin, priceMax, specFilters]);

  const sorted = useMemo(() => {
    const result = [...displayedListings];
    if (sortBy === "price-asc") {
      result.sort((a, b) => effectivePrice(a) - effectivePrice(b));
    } else if (sortBy === "price-desc") {
      result.sort((a, b) => effectivePrice(b) - effectivePrice(a));
    } else if (sortBy === "year-desc") {
      result.sort((a, b) => b.year - a.year);
    } else {
      result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    return result;
  }, [displayedListings, sortBy]);

  const { page, setPage, pageItems, totalPages } = usePagination(sorted, 20, initialPage);

  // Keep page/sort in the URL — they change WHICH content is visible, so each
  // combination must be its own crawlable, shareable, bookmarkable address.
  // Search/brand/year/price/spec filters stay client-only state (deliberately
  // not synced — faceted-filter combinations aren't meant to be individually
  // indexed).
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
    { value: "year-desc", label: t("sortYearDesc") },
  ];

  const specFiltersByField = useMemo(() => {
    const map = new Map<VehicleSpecField, VehicleCategoryFilter>();
    for (const filter of filters) {
      if (filter.specField) map.set(filter.specField, filter);
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
            resetToFirstPage();
          },
        });
      }
    }

    if (yearMin.trim() || yearMax.trim()) {
      tags.push({
        key: "year",
        label: `${t("yearFilterLabel")}: ${yearMin || "?"}–${yearMax || "?"}`,
        onRemove: () => {
          setYearMin("");
          setYearMax("");
          resetToFirstPage();
        },
      });
    }

    if (priceMin.trim() || priceMax.trim()) {
      tags.push({
        key: "price",
        label: `${t("priceFilterLabel")}: ${priceMin || "?"}–${priceMax || "?"}`,
        onRemove: () => {
          setPriceMin("");
          setPriceMax("");
          resetToFirstPage();
        },
      });
    }

    for (const [fieldText, state] of Object.entries(specFilterState)) {
      const field = fieldText as VehicleSpecField;
      const filter = specFiltersByField.get(field);
      if (!filter) continue;

      for (const optionId of state.optionIds) {
        const option = filter.lookupOptions?.find((item) => item.id === optionId);
        if (!option) continue;
        tags.push({
          key: `spec-${field}-opt-${optionId}`,
          label: option.label[locale],
          onRemove: () => toggleSpecOption(field, optionId),
        });
      }

      if (state.booleanEnabled) {
        tags.push({
          key: `spec-${field}-bool`,
          label: filter.specFieldLabel?.[locale] ?? field,
          onRemove: () => toggleSpecBoolean(field),
        });
      }

      if (state.numberMin.trim() || state.numberMax.trim()) {
        tags.push({
          key: `spec-${field}-range`,
          label: `${filter.specFieldLabel?.[locale] ?? field}: ${state.numberMin || "?"}–${state.numberMax || "?"}`,
          onRemove: () => {
            updateSpecState(field, { numberMin: "", numberMax: "" });
            resetToFirstPage();
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
    yearMin,
    yearMax,
    priceMin,
    priceMax,
    specFilterState,
    specFiltersByField,
    locale,
  ]);

  function handleClearAllFilters() {
    setSearch("");
    setSelectedBrandIds([]);
    setYearMin("");
    setYearMax("");
    setPriceMin("");
    setPriceMax("");
    setSpecFilterState({});
    resetToFirstPage();
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
      <VehicleFilters
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
            current.includes(brandId) ? current.filter((id) => id !== brandId) : [...current, brandId],
          );
          resetToFirstPage();
        }}
        yearMin={yearMin}
        yearMax={yearMax}
        onYearMinChange={(value) => {
          setYearMin(value);
          resetToFirstPage();
        }}
        onYearMaxChange={(value) => {
          setYearMax(value);
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
        specFilterState={specFilterState}
        onToggleSpecOption={toggleSpecOption}
        onToggleSpecBoolean={toggleSpecBoolean}
        onSpecNumberRangeChange={handleSpecNumberRangeChange}
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
                getKey={(listing) => listing.id}
                emptyMessage={t("emptyState")}
                renderItem={(listing, layout) => (
                  <VehicleListingCard listing={listing} layout={layout} />
                )}
                loading={loading}
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
