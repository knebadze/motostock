"use client";

import { useLocale, useTranslations } from "next-intl";
import type { VehicleCategoryFilter, VehicleSpecField } from "@/lib/api/vehicle-category-filters";
import type { BrandOption } from "./ProductFilters";

export type SpecFilterState = {
  optionIds: number[];
  booleanEnabled: boolean;
  numberMin: string;
  numberMax: string;
};

export function VehicleFilters({
  search,
  onSearchChange,
  filters,
  brandOptions,
  selectedBrandIds,
  onToggleBrand,
  yearMin,
  yearMax,
  onYearMinChange,
  onYearMaxChange,
  priceMin,
  priceMax,
  onPriceMinChange,
  onPriceMaxChange,
  specFilterState,
  onToggleSpecOption,
  onToggleSpecBoolean,
  onSpecNumberRangeChange,
}: {
  search: string;
  onSearchChange: (value: string) => void;
  filters: VehicleCategoryFilter[];
  brandOptions: BrandOption[];
  selectedBrandIds: number[];
  onToggleBrand: (brandId: number) => void;
  yearMin: string;
  yearMax: string;
  onYearMinChange: (value: string) => void;
  onYearMaxChange: (value: string) => void;
  priceMin: string;
  priceMax: string;
  onPriceMinChange: (value: string) => void;
  onPriceMaxChange: (value: string) => void;
  specFilterState: Partial<Record<VehicleSpecField, SpecFilterState>>;
  onToggleSpecOption: (field: VehicleSpecField, optionId: number) => void;
  onToggleSpecBoolean: (field: VehicleSpecField) => void;
  onSpecNumberRangeChange: (field: VehicleSpecField, part: "min" | "max", value: string) => void;
}) {
  const locale = useLocale() as "ka" | "en" | "ru";
  const t = useTranslations("Shop");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1.5">
        <input
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder={t("searchPlaceholder")}
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
        />
      </div>

      {filters.map((filter) => {
        if (filter.filterType === "BRAND") {
          if (brandOptions.length === 0) return null;
          return (
            <div key={filter.id} className="flex flex-col gap-2">
              <span className="text-sm font-medium">{t("brandFilterLabel")}</span>
              <div className="flex flex-col gap-1.5">
                {brandOptions.map((brand) => (
                  <label key={brand.id} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={selectedBrandIds.includes(brand.id)}
                      onChange={() => onToggleBrand(brand.id)}
                      className="size-4 rounded border-border accent-primary"
                    />
                    {brand.label}
                  </label>
                ))}
              </div>
            </div>
          );
        }

        if (filter.filterType === "YEAR") {
          return (
            <div key={filter.id} className="flex flex-col gap-2">
              <span className="text-sm font-medium">{t("yearFilterLabel")}</span>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={yearMin}
                  onChange={(event) => onYearMinChange(event.target.value)}
                  placeholder={t("yearMinPlaceholder")}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                />
                <span className="text-muted-foreground">—</span>
                <input
                  type="number"
                  value={yearMax}
                  onChange={(event) => onYearMaxChange(event.target.value)}
                  placeholder={t("yearMaxPlaceholder")}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                />
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
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                />
                <span className="text-muted-foreground">—</span>
                <input
                  type="number"
                  value={priceMax}
                  onChange={(event) => onPriceMaxChange(event.target.value)}
                  placeholder={t("priceMaxPlaceholder")}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                />
              </div>
            </div>
          );
        }

        const field = filter.specField;
        if (!field) return null;
        const state = specFilterState[field];
        const label = filter.specFieldLabel?.[locale] ?? "";

        if (filter.specFieldKind === "LOOKUP") {
          const options = filter.lookupOptions ?? [];
          if (options.length === 0) return null;
          return (
            <div key={filter.id} className="flex flex-col gap-2">
              <span className="text-sm font-medium">{label}</span>
              <div className="flex flex-col gap-1.5">
                {options.map((option) => (
                  <label key={option.id} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={state?.optionIds.includes(option.id) ?? false}
                      onChange={() => onToggleSpecOption(field, option.id)}
                      className="size-4 rounded border-border accent-primary"
                    />
                    {option.label[locale]}
                  </label>
                ))}
              </div>
            </div>
          );
        }

        if (filter.specFieldKind === "BOOLEAN") {
          return (
            <label key={filter.id} className="flex items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                checked={state?.booleanEnabled ?? false}
                onChange={() => onToggleSpecBoolean(field)}
                className="size-4 rounded border-border accent-primary"
              />
              {label}
            </label>
          );
        }

        if (filter.specFieldKind === "NUMBER") {
          return (
            <div key={filter.id} className="flex flex-col gap-2">
              <span className="text-sm font-medium">{label}</span>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={state?.numberMin ?? ""}
                  onChange={(event) => onSpecNumberRangeChange(field, "min", event.target.value)}
                  placeholder={t("priceMinPlaceholder")}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                />
                <span className="text-muted-foreground">—</span>
                <input
                  type="number"
                  value={state?.numberMax ?? ""}
                  onChange={(event) => onSpecNumberRangeChange(field, "max", event.target.value)}
                  placeholder={t("priceMaxPlaceholder")}
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
