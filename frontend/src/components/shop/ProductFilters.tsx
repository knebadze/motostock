"use client";

import { useTranslations } from "next-intl";

export type BrandOption = { id: number; label: string };

export function ProductFilters({
  search,
  onSearchChange,
  brandOptions,
  selectedBrandIds,
  onToggleBrand,
  priceMin,
  priceMax,
  onPriceMinChange,
  onPriceMaxChange,
}: {
  search: string;
  onSearchChange: (value: string) => void;
  brandOptions: BrandOption[];
  selectedBrandIds: number[];
  onToggleBrand: (brandId: number) => void;
  priceMin: string;
  priceMax: string;
  onPriceMinChange: (value: string) => void;
  onPriceMaxChange: (value: string) => void;
}) {
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

      {brandOptions.length > 0 && (
        <div className="flex flex-col gap-2">
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
      )}

      <div className="flex flex-col gap-2">
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
    </div>
  );
}
