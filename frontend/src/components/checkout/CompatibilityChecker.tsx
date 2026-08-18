"use client";

import { useId, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { Select } from "@/components/shared/Select";
import { ManualVehicleSelect } from "@/components/home/ManualVehicleSelect";
import { checkProductsCompatibility } from "@/lib/api/products";
import { ApiRequestError } from "@/lib/api/client";
import { formatVehicleCatalogLabel } from "@/lib/format";
import type { GarageVehicle, VehicleCatalogEntry } from "@/lib/api/vehicle-catalog";
import type { LocalizedString } from "@/lib/api/categories";

// Same "garage vehicle vs pick brand/model/year by hand" resolution as
// VehicleSearchForm.tsx (homepage hero) — reuses its ManualVehicleSelect
// directly — but instead of navigating to /compatible-products/{id}, it
// checks the resolved vehicle against exactly the products already in the
// cart and shows a per-item result inline. Purely informational: doesn't
// block placing the order either way.
export function CompatibilityChecker({
  vehicleCatalog,
  garageVehicles,
  products,
}: {
  vehicleCatalog: VehicleCatalogEntry[];
  garageVehicles: GarageVehicle[];
  products: { id: number; name: LocalizedString }[];
}) {
  const locale = useLocale() as "ka" | "en" | "ru";
  const t = useTranslations("Checkout");
  const tHome = useTranslations("Home");
  const tSelect = useTranslations("Common.select");

  const garageSelectId = useId();
  const [garageVehicleId, setGarageVehicleId] = useState("");
  const [brandId, setBrandId] = useState("");
  const [modelId, setModelId] = useState("");
  const [year, setYear] = useState("");
  const [checking, setChecking] = useState(false);
  const [compatibleIds, setCompatibleIds] = useState<Set<number> | null>(null);

  const hasGarage = garageVehicles.length > 0;

  function resetResult() {
    if (compatibleIds) setCompatibleIds(null);
  }

  function handleGarageChange(value: string) {
    setGarageVehicleId(value);
    if (value) {
      setBrandId("");
      setModelId("");
      setYear("");
    }
    resetResult();
  }

  function handleBrandChange(value: string) {
    setGarageVehicleId("");
    setBrandId(value);
    setModelId("");
    setYear("");
    resetResult();
  }

  function handleModelChange(value: string) {
    setGarageVehicleId("");
    setModelId(value);
    setYear("");
    resetResult();
  }

  function handleYearChange(value: string) {
    setGarageVehicleId("");
    setYear(value);
    resetResult();
  }

  const matchingEntries = useMemo(
    () =>
      vehicleCatalog.filter(
        (entry) => String(entry.brand.id) === brandId && String(entry.model.id) === modelId,
      ),
    [vehicleCatalog, brandId, modelId],
  );

  function resolveVehicleCatalogId(): number | null {
    if (garageVehicleId) return Number(garageVehicleId);

    const yearNum = Number(year);
    const resolved = matchingEntries.find(
      (entry) =>
        (entry.yearFrom == null || yearNum >= entry.yearFrom) &&
        (entry.yearTo == null || yearNum <= entry.yearTo),
    );
    return resolved?.id ?? null;
  }

  async function handleCheck() {
    const vehicleCatalogId = resolveVehicleCatalogId();
    if (!vehicleCatalogId) return;

    setChecking(true);
    try {
      const ids = await checkProductsCompatibility(
        products.map((product) => product.id),
        vehicleCatalogId,
      );
      setCompatibleIds(new Set(ids));
    } catch (error) {
      toast.error(error instanceof ApiRequestError ? error.message : t("compatibilityError"));
    } finally {
      setChecking(false);
    }
  }

  const canCheck = Boolean(garageVehicleId) || Boolean(brandId && modelId && year);

  if (products.length === 0) return null;

  const garageOptions = [
    { value: "", label: tHome("searchGaragePlaceholder") },
    ...garageVehicles.map((vehicle) => ({
      value: String(vehicle.vehicleCatalog.id),
      label: formatVehicleCatalogLabel(vehicle.vehicleCatalog),
    })),
  ];

  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <h2 className="font-semibold text-foreground">{t("compatibilityHeading")}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{t("compatibilityIntro")}</p>

      <div className="mt-4 flex flex-col gap-3">
        {hasGarage && (
          <>
            <div>
              <label
                htmlFor={garageSelectId}
                className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground"
              >
                {tHome("searchGarageLabel")}
              </label>
              <Select
                id={garageSelectId}
                options={garageOptions}
                value={garageVehicleId}
                onChange={handleGarageChange}
                searchable
                placeholder={tHome("searchGaragePlaceholder")}
                searchPlaceholder={tSelect("search")}
                emptyLabel={tSelect("empty")}
              />
            </div>
            <div className="flex items-center gap-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              <span className="h-px flex-1 bg-border" />
              {tHome("searchOrDivider")}
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
            onClick={handleCheck}
            disabled={!canCheck || checking}
            className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover disabled:opacity-50"
          >
            {checking ? t("compatibilityChecking") : t("compatibilityCheckButton")}
          </button>
        </div>
      </div>

      {compatibleIds && (
        <ul className="mt-4 flex flex-col gap-2 border-t border-border pt-4">
          {products.map((product) => {
            const isCompatible = compatibleIds.has(product.id);
            return (
              <li key={product.id} className="flex items-center justify-between gap-3 text-sm">
                <span className="truncate text-foreground">{product.name[locale]}</span>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    isCompatible ? "bg-green-500/10 text-green-600" : "bg-red-500/10 text-red-600"
                  }`}
                >
                  {isCompatible ? t("compatibleLabel") : t("incompatibleLabel")}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
