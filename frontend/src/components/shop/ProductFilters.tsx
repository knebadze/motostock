"use client";

import { useLocale, useTranslations } from "next-intl";
import { Select } from "@/components/shared/Select";
import { Link } from "@/i18n/navigation";
import type { CategoryFilter } from "@/lib/api/category-filters";
import type { GarageVehicle } from "@/lib/api/vehicle-catalog";
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
  garageVehicles,
  selectedVehicleCatalogId,
  onVehicleChange,
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
  garageVehicles: GarageVehicle[];
  selectedVehicleCatalogId: string;
  onVehicleChange: (value: string) => void;
}) {
  const locale = useLocale() as "ka" | "en" | "ru";
  const t = useTranslations("Shop");
  const tSelect = useTranslations("Common.select");

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
              <span className="text-sm font-medium">{t("myVehicleFilterLabel")}</span>
              <Select
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
