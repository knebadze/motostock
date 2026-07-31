"use client";

import { useLocale, useTranslations } from "next-intl";
import type { CategoryFilter } from "@/lib/api/category-filters";

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
  filters,
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
}: {
  search: string;
  onSearchChange: (value: string) => void;
  filters: CategoryFilter[];
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

        const attribute = filter.attribute;
        if (!attribute) return null;
        const state = attributeFilterState[attribute.id];

        if (attribute.valueType === "SELECT") {
          if (attribute.options.length === 0) return null;
          return (
            <div key={filter.id} className="flex flex-col gap-2">
              <span className="text-sm font-medium">{attribute.name[locale]}</span>
              <div className="flex flex-col gap-1.5">
                {attribute.options.map((option) => (
                  <label key={option.id} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={state?.optionIds.includes(option.id) ?? false}
                      onChange={() => onToggleOption(attribute.id, option.id)}
                      className="size-4 rounded border-border accent-primary"
                    />
                    {option.label[locale]}
                  </label>
                ))}
              </div>
            </div>
          );
        }

        if (attribute.valueType === "BOOLEAN") {
          return (
            <label key={filter.id} className="flex items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                checked={state?.booleanEnabled ?? false}
                onChange={() => onToggleBoolean(attribute.id)}
                className="size-4 rounded border-border accent-primary"
              />
              {attribute.name[locale]}
            </label>
          );
        }

        if (attribute.valueType === "NUMBER") {
          return (
            <div key={filter.id} className="flex flex-col gap-2">
              <span className="text-sm font-medium">{attribute.name[locale]}</span>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={state?.numberMin ?? ""}
                  onChange={(event) => onNumberRangeChange(attribute.id, "min", event.target.value)}
                  placeholder={t("priceMinPlaceholder")}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                />
                <span className="text-muted-foreground">—</span>
                <input
                  type="number"
                  value={state?.numberMax ?? ""}
                  onChange={(event) => onNumberRangeChange(attribute.id, "max", event.target.value)}
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
