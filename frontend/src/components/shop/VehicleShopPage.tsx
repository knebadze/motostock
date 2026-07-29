"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import type { SelectOption } from "@/components/shared/Select";
import { Pagination, usePagination } from "@/components/shared/Pagination";
import type { Category } from "@/lib/api/categories";
import type { VehicleListing } from "@/lib/api/vehicle-listings";
import { VehicleFilters } from "./VehicleFilters";
import type { BrandOption } from "./ProductFilters";
import { VehicleListingCard } from "./VehicleListingCard";
import { ShopHero } from "./ShopHero";
import { SubcategoryGrid } from "./SubcategoryGrid";
import { ShopToolbar } from "./ShopToolbar";
import { ShopItemGrid } from "./ShopItemGrid";
import type { ViewMode } from "./ViewModeToggle";

type SortBy = "newest" | "price-asc" | "price-desc" | "year-desc";
const SORT_VALUES: SortBy[] = ["newest", "price-asc", "price-desc", "year-desc"];

function parseSortBy(value: string): SortBy {
  return (SORT_VALUES as string[]).includes(value) ? (value as SortBy) : "newest";
}

function effectivePrice(listing: VehicleListing): number {
  return listing.activeDiscount?.discountPrice ?? listing.price;
}

export function VehicleShopPage({
  category,
  breadcrumbChain,
  subcategories,
  listings,
  initialPage = 1,
  initialSort = "newest",
}: {
  category: Category;
  breadcrumbChain: Category[];
  subcategories: Category[];
  listings: VehicleListing[];
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
  const [sortBy, setSortBy] = useState<SortBy>(() => parseSortBy(initialSort));
  const [viewMode, setViewMode] = useState<ViewMode>("grid");

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

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    const minYear = yearMin ? Number(yearMin) : null;
    const maxYear = yearMax ? Number(yearMax) : null;
    const minPrice = priceMin ? Number(priceMin) : null;
    const maxPrice = priceMax ? Number(priceMax) : null;

    const result = listings.filter((listing) => {
      const title = `${listing.vehicleCatalog.brand.name[locale]} ${listing.vehicleCatalog.model.name[locale]}`.toLowerCase();
      if (query && !title.includes(query)) return false;
      if (selectedBrandIds.length > 0 && !selectedBrandIds.includes(listing.vehicleCatalog.brand.id)) {
        return false;
      }
      if (minYear != null && listing.year < minYear) return false;
      if (maxYear != null && listing.year > maxYear) return false;
      const price = effectivePrice(listing);
      if (minPrice != null && price < minPrice) return false;
      if (maxPrice != null && price > maxPrice) return false;
      return true;
    });

    const sorted = [...result];
    if (sortBy === "price-asc") {
      sorted.sort((a, b) => effectivePrice(a) - effectivePrice(b));
    } else if (sortBy === "price-desc") {
      sorted.sort((a, b) => effectivePrice(b) - effectivePrice(a));
    } else if (sortBy === "year-desc") {
      sorted.sort((a, b) => b.year - a.year);
    } else {
      sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    return sorted;
  }, [listings, search, selectedBrandIds, yearMin, yearMax, priceMin, priceMax, sortBy, locale]);

  const { page, setPage, pageItems, totalPages } = usePagination(filtered, 20, initialPage);

  function resetToFirstPage() {
    setPage(1);
  }

  // Keep page/sort in the URL — they change WHICH content is visible, so each
  // combination must be its own crawlable, shareable, bookmarkable address.
  // Search/brand/year/price stay client-only state (deliberately not synced —
  // faceted-filter combinations aren't meant to be individually indexed).
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
              <VehicleFilters
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
                getKey={(listing) => listing.id}
                emptyMessage={t("emptyState")}
                renderItem={(listing, layout) => (
                  <VehicleListingCard listing={listing} layout={layout} />
                )}
              />

              <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
