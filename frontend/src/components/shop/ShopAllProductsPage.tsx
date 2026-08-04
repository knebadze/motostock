"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { Pagination, usePagination } from "@/components/shared/Pagination";
import { Select, type SelectOption } from "@/components/shared/Select";
import { ShopToolbar } from "./ShopToolbar";
import { ShopItemGrid } from "./ShopItemGrid";
import { ProductCard } from "./ProductCard";
import type { ViewMode } from "./ViewModeToggle";
import { listProducts, type Product } from "@/lib/api/products";
import type { GarageVehicle } from "@/lib/api/vehicle-catalog";
import { ApiRequestError } from "@/lib/api/client";
import { formatVehicleCatalogLabel } from "@/lib/format";

type SortBy = "newest" | "price-asc" | "price-desc";
const SORT_VALUES: SortBy[] = ["newest", "price-asc", "price-desc"];

function parseSortBy(value: string): SortBy {
  return (SORT_VALUES as string[]).includes(value) ? (value as SortBy) : "newest";
}

// One general "browse everything" page (not tied to a single category, which
// keeps its own dedicated /{categorySlug} route+URL for SEO) — used for
// cross-category discovery: sale (?onSale=true), search, or just "see
// everything". Cloned from the same search+category-checkboxes+sort+grid
// structure as CompatibleProductsPage.tsx; the "my vehicle" filter is the
// one exception that needs a live server refetch (fitment resolution is
// backend-only), everything else stays client-side over the fetched set.
export function ShopAllProductsPage({
  products,
  garageVehicles,
  initialOnSale,
  initialCategoryId,
  initialBrandIds,
}: {
  products: Product[];
  garageVehicles: GarageVehicle[];
  initialOnSale: boolean;
  initialCategoryId?: number;
  initialBrandIds?: number[];
}) {
  const locale = useLocale() as "ka" | "en" | "ru";
  const t = useTranslations("Shop");
  const [baseProducts, setBaseProducts] = useState(products);
  const [vehicleCatalogId, setVehicleCatalogId] = useState("");
  const [vehicleLoading, setVehicleLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<number[]>([]);
  const [sortBy, setSortBy] = useState<SortBy>(() => parseSortBy("newest"));
  const [viewMode, setViewMode] = useState<ViewMode>("grid");

  async function handleVehicleChange(value: string) {
    setVehicleCatalogId(value);
    setSelectedCategoryIds([]);
    setVehicleLoading(true);
    try {
      const next = await listProducts({
        vehicleCatalogId: value ? Number(value) : undefined,
        categoryId: initialCategoryId,
        brandIds: initialBrandIds,
        onSale: initialOnSale || undefined,
      });
      setBaseProducts(next);
    } catch (error) {
      const message =
        error instanceof ApiRequestError ? error.message : "პროდუქტების ჩატვირთვა ვერ მოხერხდა";
      toast.error(message);
    } finally {
      setVehicleLoading(false);
    }
  }

  const vehicleOptions: SelectOption[] = [
    { value: "", label: t("myVehicleAllOption") },
    ...garageVehicles.map((vehicle) => ({
      value: String(vehicle.vehicleCatalog.id),
      label: formatVehicleCatalogLabel(vehicle.vehicleCatalog, locale),
    })),
  ];

  const categoryOptions = useMemo(() => {
    const byId = new Map<number, Product["category"]>();
    for (const product of baseProducts) {
      if (!byId.has(product.category.id)) byId.set(product.category.id, product.category);
    }
    return Array.from(byId.values()).sort((a, b) =>
      a.name[locale].localeCompare(b.name[locale]),
    );
  }, [baseProducts, locale]);

  function toggleCategory(categoryId: number) {
    setSelectedCategoryIds((current) =>
      current.includes(categoryId)
        ? current.filter((id) => id !== categoryId)
        : [...current, categoryId],
    );
  }

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return baseProducts.filter((product) => {
      if (selectedCategoryIds.length > 0 && !selectedCategoryIds.includes(product.category.id)) {
        return false;
      }
      if (query && !product.name[locale].toLowerCase().includes(query)) return false;
      return true;
    });
  }, [baseProducts, selectedCategoryIds, search, locale]);

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

  return (
    <div className="border-t border-border bg-muted/40">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-bold tracking-tight">
          {initialOnSale ? t("saleHeading") : t("shopHeading")}
        </h1>

        <div className="mt-8 grid grid-cols-1 gap-8 md:grid-cols-[280px_1fr]">
          <aside className="h-fit rounded-2xl border border-border bg-card p-5 shadow-sm md:sticky md:top-24">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              {t("filtersHeading")}
            </h2>
            <div className="flex flex-col gap-6">
              <input
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                placeholder={t("searchPlaceholder")}
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              />

              {garageVehicles.length > 0 && (
                <div className="flex flex-col gap-2">
                  <span className="text-sm font-medium">{t("myVehicleFilterLabel")}</span>
                  <Select
                    options={vehicleOptions}
                    value={vehicleCatalogId}
                    onChange={(value) => {
                      handleVehicleChange(value);
                      setPage(1);
                    }}
                    searchable
                    placeholder={t("myVehiclePlaceholder")}
                  />
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
              loading={vehicleLoading}
            />

            <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
          </div>
        </div>
      </div>
    </div>
  );
}
