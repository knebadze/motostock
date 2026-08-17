"use client";

import { useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Select } from "@/components/shared/Select";
import type { VehicleCatalogEntry } from "@/lib/api/vehicle-catalog";

// Pure presentational brand→model→year cascade — all state lives in the
// parent (VehicleSearchForm), which also owns the "garage vs manual" choice
// and disables this whole block once a garage vehicle is picked instead.
export function ManualVehicleSelect({
  vehicleCatalog,
  brandId,
  modelId,
  year,
  onBrandChange,
  onModelChange,
  onYearChange,
  disabled,
}: {
  vehicleCatalog: VehicleCatalogEntry[];
  brandId: string;
  modelId: string;
  year: string;
  onBrandChange: (value: string) => void;
  onModelChange: (value: string) => void;
  onYearChange: (value: string) => void;
  disabled?: boolean;
}) {
  const locale = useLocale() as "ka" | "en" | "ru";
  const t = useTranslations("Home");
  const tSelect = useTranslations("Common.select");

  const brandOptions = useMemo(() => {
    const byId = new Map<number, VehicleCatalogEntry["brand"]>();
    for (const entry of vehicleCatalog) {
      if (!byId.has(entry.brand.id)) byId.set(entry.brand.id, entry.brand);
    }
    return Array.from(byId.values())
      .map((brand) => ({ value: String(brand.id), label: brand.name[locale] }))
      .sort((a, b) => a.label.localeCompare(b.label, locale));
  }, [vehicleCatalog, locale]);

  const modelOptions = useMemo(() => {
    const byId = new Map<number, VehicleCatalogEntry["model"]>();
    for (const entry of vehicleCatalog) {
      if (String(entry.brand.id) !== brandId) continue;
      if (!byId.has(entry.model.id)) byId.set(entry.model.id, entry.model);
    }
    return Array.from(byId.values())
      .map((model) => ({ value: String(model.id), label: model.name[locale] }))
      .sort((a, b) => a.label.localeCompare(b.label, locale));
  }, [vehicleCatalog, brandId, locale]);

  // Years offered are only ones actually covered by a real catalog entry for
  // this brand+model, so the chosen (brand, model, year) triple always
  // resolves to at least one VehicleCatalog row.
  const yearOptions = useMemo(() => {
    const years = new Set<number>();
    for (const entry of vehicleCatalog) {
      if (String(entry.brand.id) !== brandId || String(entry.model.id) !== modelId) continue;
      const from = entry.yearFrom ?? entry.yearTo;
      const to = entry.yearTo ?? entry.yearFrom;
      if (from == null || to == null) continue;
      for (let y = from; y <= to; y++) years.add(y);
    }
    return Array.from(years)
      .sort((a, b) => b - a)
      .map((y) => ({ value: String(y), label: String(y) }));
  }, [vehicleCatalog, brandId, modelId]);

  return (
    <>
      <div className="flex-1">
        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {t("searchBrandLabel")}
        </label>
        <Select
          options={brandOptions}
          value={brandId}
          onChange={onBrandChange}
          searchable
          disabled={disabled}
          placeholder={t("searchBrandPlaceholder")}
          searchPlaceholder={tSelect("search")}
          emptyLabel={tSelect("empty")}
        />
      </div>
      <div className="flex-1">
        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {t("searchModelLabel")}
        </label>
        <Select
          options={modelOptions}
          value={modelId}
          onChange={onModelChange}
          searchable
          disabled={disabled || !brandId}
          placeholder={brandId ? t("searchModelPlaceholder") : t("searchSelectBrandFirst")}
          searchPlaceholder={tSelect("search")}
          emptyLabel={tSelect("empty")}
        />
      </div>
      <div className="flex-1">
        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {t("searchYearLabel")}
        </label>
        <Select
          options={yearOptions}
          value={year}
          onChange={onYearChange}
          disabled={disabled || !modelId}
          placeholder={t("searchYearPlaceholder")}
          emptyLabel={tSelect("empty")}
        />
      </div>
    </>
  );
}
