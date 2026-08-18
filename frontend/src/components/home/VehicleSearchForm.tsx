"use client";

import { useId, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Select } from "@/components/shared/Select";
import type { GarageVehicle, VehicleCatalogEntry } from "@/lib/api/vehicle-catalog";
import { formatVehicleCatalogLabel } from "@/lib/format";
import { ManualVehicleSelect } from "./ManualVehicleSelect";

// Orchestrates the two ways a visitor can identify their vehicle: pick it
// straight from their own garage (logged-in customers with saved vehicles
// only), or fill in brand/model/year by hand (ManualVehicleSelect) — the two
// are mutually exclusive, picking one clears/disables the other.
export function VehicleSearchForm({
  vehicleCatalog,
  garageVehicles,
}: {
  vehicleCatalog: VehicleCatalogEntry[];
  garageVehicles: GarageVehicle[];
}) {
  const t = useTranslations("Home");
  const tSelect = useTranslations("Common.select");
  const router = useRouter();
  const garageSelectId = useId();

  const [garageVehicleId, setGarageVehicleId] = useState("");
  const [brandId, setBrandId] = useState("");
  const [modelId, setModelId] = useState("");
  const [year, setYear] = useState("");

  const hasGarage = garageVehicles.length > 0;

  function handleGarageChange(value: string) {
    setGarageVehicleId(value);
    if (value) {
      setBrandId("");
      setModelId("");
      setYear("");
    }
  }

  function handleBrandChange(value: string) {
    setGarageVehicleId("");
    setBrandId(value);
    setModelId("");
    setYear("");
  }

  function handleModelChange(value: string) {
    setGarageVehicleId("");
    setModelId(value);
    setYear("");
  }

  function handleYearChange(value: string) {
    setGarageVehicleId("");
    setYear(value);
  }

  const matchingEntries = useMemo(
    () =>
      vehicleCatalog.filter(
        (entry) => String(entry.brand.id) === brandId && String(entry.model.id) === modelId,
      ),
    [vehicleCatalog, brandId, modelId],
  );

  function handleSearch() {
    if (garageVehicleId) {
      router.push(`/compatible-products/${garageVehicleId}`);
      return;
    }

    const yearNum = Number(year);
    // If more than one catalog row covers this exact year (different
    // variants/trims of the same brand+model+year), just take the first —
    // good enough to land the visitor in the right compatible-products set,
    // which they can refine further with the destination page's own filters.
    const resolved = matchingEntries.find(
      (entry) =>
        (entry.yearFrom == null || yearNum >= entry.yearFrom) &&
        (entry.yearTo == null || yearNum <= entry.yearTo),
    );
    if (!resolved) return;
    router.push(`/compatible-products/${resolved.id}`);
  }

  const canSearch = Boolean(garageVehicleId) || Boolean(brandId && modelId && year);

  const garageOptions = [
    { value: "", label: t("searchGaragePlaceholder") },
    ...garageVehicles.map((vehicle) => ({
      value: String(vehicle.vehicleCatalog.id),
      label: formatVehicleCatalogLabel(vehicle.vehicleCatalog),
    })),
  ];

  return (
    <div className="flex w-full max-w-3xl flex-col gap-3 rounded-2xl bg-background/95 p-4 shadow-xl backdrop-blur sm:p-5">
      {hasGarage && (
        <>
          <div>
            <label
              htmlFor={garageSelectId}
              className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground"
            >
              {t("searchGarageLabel")}
            </label>
            <Select
              id={garageSelectId}
              options={garageOptions}
              value={garageVehicleId}
              onChange={handleGarageChange}
              searchable
              placeholder={t("searchGaragePlaceholder")}
              searchPlaceholder={tSelect("search")}
              emptyLabel={tSelect("empty")}
            />
          </div>

          <div className="flex items-center gap-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            <span className="h-px flex-1 bg-border" />
            {t("searchOrDivider")}
            <span className="h-px flex-1 bg-border" />
          </div>
        </>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <ManualVehicleSelect
          vehicleCatalog={vehicleCatalog}
          brandId={brandId}
          modelId={modelId}
          year={year}
          onBrandChange={handleBrandChange}
          onModelChange={handleModelChange}
          onYearChange={handleYearChange}
          disabled={Boolean(garageVehicleId)}
        />
        <button
          type="button"
          onClick={handleSearch}
          disabled={!canSearch}
          className="rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover disabled:opacity-50"
        >
          {t("searchButton")}
        </button>
      </div>
    </div>
  );
}
