"use client";

import { useId, type ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Select } from "@/components/shared/Select";
import { Link } from "@/i18n/navigation";
import type { CategoryFilter } from "@/lib/api/category-filters";
import type { GarageVehicle } from "@/lib/api/vehicle-catalog";
import type { ProductFacetCounts } from "@/lib/api/products";
import { formatVehicleCatalogLabel } from "@/lib/format";

export type BrandOption = { id: number; label: string };

export type AttributeFilterState = {
  optionIds: number[];
  booleanEnabled: boolean;
  numberMin: string;
  numberMax: string;
};

export function ProductFilters({
  search,
  onSearchChange,
  subcategoryFilter,
  filters,
  facetCounts,
  brandOptions,
  selectedBrandIds,
  onToggleBrand,
  priceMin,
  priceMax,
  onPriceMinChange,
  onPriceMaxChange,
  attributeFilterState,
  onToggleOption,
  onToggleBoolean,
  onNumberRangeChange,
  garageVehicles,
  selectedVehicleCatalogId,
  onVehicleChange,
}: {
  search: string;
  onSearchChange: (value: string) => void;
  // SubcategoryFilter, rendered right under the search box.
  subcategoryFilter?: ReactNode;
  filters: CategoryFilter[];
  // Live counts under the current filters (ProductShopPage); when absent
  // (other pages, or not loaded yet) options show the category's own static
  // counts and brands show none.
  facetCounts?: ProductFacetCounts | null;
  brandOptions: BrandOption[];
  selectedBrandIds: number[];
  onToggleBrand: (brandId: number) => void;
  priceMin: string;
  priceMax: string;
  onPriceMinChange: (value: string) => void;
  onPriceMaxChange: (value: string) => void;
  attributeFilterState: Record<number, AttributeFilterState>;
  onToggleOption: (attributeId: number, optionId: number) => void;
  onToggleBoolean: (attributeId: number) => void;
  onNumberRangeChange: (attributeId: number, field: "min" | "max", value: string) => void;
  garageVehicles: GarageVehicle[];
  selectedVehicleCatalogId: string;
  onVehicleChange: (value: string) => void;
}) {
  const locale = useLocale() as "ka" | "en" | "ru";
  const t = useTranslations("Shop");
  const tSelect = useTranslations("Common.select");
  const myVehicleSelectId = useId();

  const brandCounts = facetCounts ? new Map(facetCounts.brands.map((row) => [row.id, row.count])) : null;
  const optionCounts = facetCounts
    ? new Map(facetCounts.options.map((row) => [`${row.attributeId}:${row.optionId}`, row.count]))
    : null;
  const booleanCounts = facetCounts ? new Map(facetCounts.booleans.map((row) => [row.attributeId, row.count])) : null;
  // A value that would leave no results is dimmed, not hidden — a ticked one
  // must stay where it is so it can be unticked.
  const dimmed = (count: number | null | undefined, checked: boolean) => (count === 0 && !checked ? " opacity-50" : "");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1.5">
        <input
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder={t("searchPlaceholder")}
          aria-label={t("searchPlaceholder")}
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
        />
      </div>

      {subcategoryFilter}

      {filters.map((filter) => {
        if (filter.filterType === "BRAND") {
          if (brandOptions.length === 0) return null;
          return (
            <div key={filter.id} className="flex flex-col gap-2">
              <span className="text-sm font-medium">{t("brandFilterLabel")}</span>
              <div className="flex flex-col gap-1.5">
                {brandOptions.map((brand) => {
                  const checked = selectedBrandIds.includes(brand.id);
                  const count = brandCounts ? (brandCounts.get(brand.id) ?? 0) : null;
                  return (
                    <label key={brand.id} className={`flex items-center gap-2 text-sm${dimmed(count, checked)}`}>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => onToggleBrand(brand.id)}
                        className="size-4 rounded border-border accent-primary"
                      />
                      <span className="flex-1">{brand.label}</span>
                      {count != null && <span className="text-xs text-muted-foreground">{count}</span>}
                    </label>
                  );
                })}
              </div>
            </div>
          );
        }

        if (filter.filterType === "PRICE") {
          return (
            <div key={filter.id} className="flex flex-col gap-2">
              <span className="text-sm font-medium">{t("priceFilterLabel")}</span>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={priceMin}
                  onChange={(event) => onPriceMinChange(event.target.value)}
                  placeholder={t("priceMinPlaceholder")}
                  aria-label={`${t("priceFilterLabel")} — ${t("priceMinPlaceholder")}`}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                />
                <span className="text-muted-foreground">—</span>
                <input
                  type="number"
                  value={priceMax}
                  onChange={(event) => onPriceMaxChange(event.target.value)}
                  placeholder={t("priceMaxPlaceholder")}
                  aria-label={`${t("priceFilterLabel")} — ${t("priceMaxPlaceholder")}`}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                />
              </div>
            </div>
          );
        }

        if (filter.filterType === "MY_VEHICLE") {
          // Covers both "not logged in" and "empty garage" — garageVehicles
          // is always [] for a guest (see getMyGarageFromServer), so this
          // prompt doubles as the guest case too; clicking through lands on
          // /account/garage, which itself redirects to /login when needed.
          if (garageVehicles.length === 0) {
            return (
              <div key={filter.id} className="flex flex-col gap-2">
                <span className="text-sm font-medium">{t("myVehicleFilterLabel")}</span>
                <p className="text-sm text-muted-foreground">{t("myVehicleEmptyMessage")}</p>
                <Link
                  href="/account/garage"
                  className="self-start rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary-hover"
                >
                  {t("myVehicleAddButton")}
                </Link>
              </div>
            );
          }
          const vehicleOptions = [
            { value: "", label: t("myVehicleAllOption") },
            ...garageVehicles.map((vehicle) => ({
              value: String(vehicle.vehicleCatalog.id),
              label: formatVehicleCatalogLabel(vehicle.vehicleCatalog),
            })),
          ];
          return (
            <div key={filter.id} className="flex flex-col gap-2">
              <label htmlFor={myVehicleSelectId} className="text-sm font-medium">
                {t("myVehicleFilterLabel")}
              </label>
              <Select
                id={myVehicleSelectId}
                options={vehicleOptions}
                value={selectedVehicleCatalogId}
                onChange={onVehicleChange}
                searchable
                placeholder={t("myVehiclePlaceholder")}
                searchPlaceholder={tSelect("search")}
                emptyLabel={tSelect("empty")}
              />
            </div>
          );
        }

        const attribute = filter.attribute;
        if (!attribute) return null;
        const state = attributeFilterState[attribute.id];

        if (attribute.valueType === "SELECT") {
          if (attribute.options.length === 0) return null;
          return (
            <div key={filter.id} className="flex flex-col gap-2">
              <span className="text-sm font-medium">{attribute.name[locale]}</span>
              <div className="flex flex-col gap-1.5">
                {attribute.options.map((option) => {
                  const checked = state?.optionIds.includes(option.id) ?? false;
                  const count = optionCounts ? (optionCounts.get(`${attribute.id}:${option.id}`) ?? 0) : option.count;
                  return (
                    <label key={option.id} className={`flex items-center gap-2 text-sm${dimmed(count, checked)}`}>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => onToggleOption(attribute.id, option.id)}
                        className="size-4 rounded border-border accent-primary"
                      />
                      <span className="flex-1">{option.label[locale]}</span>
                      {count != null && <span className="text-xs text-muted-foreground">{count}</span>}
                    </label>
                  );
                })}
              </div>
            </div>
          );
        }

        if (attribute.valueType === "BOOLEAN") {
          const checked = state?.booleanEnabled ?? false;
          const count = booleanCounts ? (booleanCounts.get(attribute.id) ?? 0) : attribute.trueCount;
          return (
            <label key={filter.id} className={`flex items-center gap-2 text-sm font-medium${dimmed(count, checked)}`}>
              <input
                type="checkbox"
                checked={checked}
                onChange={() => onToggleBoolean(attribute.id)}
                className="size-4 rounded border-border accent-primary"
              />
              <span className="flex-1">{attribute.name[locale]}</span>
              {count != null && <span className="text-xs font-normal text-muted-foreground">{count}</span>}
            </label>
          );
        }

        if (attribute.valueType === "NUMBER") {
          // The real range present on this page as placeholders, e.g. "8"–"45".
          const unit = attribute.unit?.[locale];
          return (
            <div key={filter.id} className="flex flex-col gap-2">
              <span className="text-sm font-medium">
                {attribute.name[locale]}
                {unit ? ` (${unit})` : ""}
              </span>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={state?.numberMin ?? ""}
                  onChange={(event) => onNumberRangeChange(attribute.id, "min", event.target.value)}
                  placeholder={attribute.range ? String(attribute.range.min) : t("priceMinPlaceholder")}
                  aria-label={`${attribute.name[locale]} — ${t("priceMinPlaceholder")}`}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                />
                <span className="text-muted-foreground">—</span>
                <input
                  type="number"
                  value={state?.numberMax ?? ""}
                  onChange={(event) => onNumberRangeChange(attribute.id, "max", event.target.value)}
                  placeholder={attribute.range ? String(attribute.range.max) : t("priceMaxPlaceholder")}
                  aria-label={`${attribute.name[locale]} — ${t("priceMaxPlaceholder")}`}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                />
              </div>
            </div>
          );
        }

        return null;
      })}
    </div>
  );
}
