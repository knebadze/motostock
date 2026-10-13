"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Link, useRouter } from "@/i18n/navigation";
import { ManualVehicleSelect } from "@/components/home/ManualVehicleSelect";
import { checkProductsCompatibility } from "@/lib/api/products";
import { listVehicleSearchOptions, type VehicleSearchOption } from "@/lib/api/vehicle-catalog";
import { persistSelectedVehicleCookie } from "@/lib/vehicle-selection";

export type FitVehicle = { id: number; label: string; slug: string };

type FitResult = { key: string; fitting: FitVehicle[] | null };

// Product page "fits your bike?" badge. Checks this product against the
// shopper's selected vehicle (cookie) or, without one, every garage vehicle
// — same backend rules as the shop's vehicle filter and the checkout check
// (POST /products/check-compatibility). With neither, offers a brand →
// model → year picker that becomes the selected vehicle (cookie + refresh,
// so buy-together/recommendations narrow to it as well).
export function VehicleFitBadge({
  productId,
  selectedVehicle,
  garageVehicles,
}: {
  productId: number;
  selectedVehicle: FitVehicle | null;
  garageVehicles: FitVehicle[];
}) {
  const t = useTranslations("ProductDetail");
  const router = useRouter();

  const candidates = useMemo(
    () => (selectedVehicle ? [selectedVehicle] : garageVehicles),
    [selectedVehicle, garageVehicles],
  );
  const candidateKey = candidates.map((vehicle) => vehicle.id).join(",");
  const [result, setResult] = useState<FitResult | null>(null);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [options, setOptions] = useState<VehicleSearchOption[] | null>(null);
  const [brandId, setBrandId] = useState("");
  const [modelId, setModelId] = useState("");
  const [year, setYear] = useState("");

  useEffect(() => {
    if (candidates.length === 0) return;
    let cancelled = false;
    const key = candidates.map((vehicle) => vehicle.id).join(",");
    Promise.all(
      candidates.map((vehicle) =>
        checkProductsCompatibility([productId], vehicle.id).then((ids) => (ids.includes(productId) ? vehicle : null)),
      ),
    )
      .then((list) => {
        if (!cancelled) setResult({ key, fitting: list.filter((vehicle): vehicle is FitVehicle => vehicle != null) });
      })
      .catch(() => {
        if (!cancelled) setResult({ key, fitting: null });
      });
    return () => {
      cancelled = true;
    };
  }, [candidates, productId]);

  // A result for an earlier vehicle set (before a refresh) counts as pending.
  const current = result && result.key === candidateKey ? result : null;

  async function openPicker() {
    setPickerOpen(true);
    if (options) return;
    try {
      setOptions(await listVehicleSearchOptions());
    } catch {
      setPickerOpen(false);
      toast.error(t("fitLoadError"));
    }
  }

  function resolveVehicleCatalogId(): number | null {
    if (!options || !year) return null;
    const yearNum = Number(year);
    return (
      options.find(
        (entry) =>
          String(entry.brand.id) === brandId &&
          String(entry.model.id) === modelId &&
          (entry.yearFrom == null || yearNum >= entry.yearFrom) &&
          (entry.yearTo == null || yearNum <= entry.yearTo),
      )?.id ?? null
    );
  }

  function handleSubmit() {
    const vehicleCatalogId = resolveVehicleCatalogId();
    if (!vehicleCatalogId) return;
    persistSelectedVehicleCookie(String(vehicleCatalogId));
    setPickerOpen(false);
    router.refresh();
  }

  const changeButton = (
    <button
      type="button"
      onClick={openPicker}
      className="text-sm font-medium text-primary-text underline-offset-2 hover:underline"
    >
      {candidates.length > 0 ? t("fitChangeVehicle") : t("fitCheckButton")}
    </button>
  );

  let status: ReactNode;
  if (candidates.length > 0 && !current) {
    status = <p className="text-sm text-muted-foreground">{t("fitChecking")}</p>;
  } else if (current?.fitting && current.fitting.length > 0) {
    status = (
      <p className="flex items-start gap-2 text-sm font-semibold text-green-700 dark:text-green-500">
        <span aria-hidden>✓</span>
        <span>{t("fitYes", { vehicle: current.fitting.map((vehicle) => vehicle.label).join(", ") })}</span>
      </p>
    );
  } else if (current?.fitting) {
    status = (
      <div className="flex flex-col gap-1">
        <p className="flex items-start gap-2 text-sm font-semibold text-amber-700 dark:text-amber-500">
          <span aria-hidden>!</span>
          <span>
            {selectedVehicle
              ? t("fitNo", { vehicle: selectedVehicle.label })
              : t("fitNoGarage")}
          </span>
        </p>
        {selectedVehicle && (
          <Link
            href={`/compatible-products/${selectedVehicle.slug}`}
            className="text-sm font-medium text-primary-text hover:underline"
          >
            {t("fitCompatibleLink")}
          </Link>
        )}
      </div>
    );
  } else {
    status = <p className="text-sm font-medium text-foreground">{t("fitQuestion")}</p>;
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="min-w-0 flex-1">{status}</div>
        {!pickerOpen && changeButton}
      </div>
      {pickerOpen && (
        <div className="flex flex-col gap-3 border-t border-border pt-3">
          {options ? (
            <>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <ManualVehicleSelect
                  vehicleCatalog={options}
                  brandId={brandId}
                  modelId={modelId}
                  year={year}
                  onBrandChange={(value) => {
                    setBrandId(value);
                    setModelId("");
                    setYear("");
                  }}
                  onModelChange={(value) => {
                    setModelId(value);
                    setYear("");
                  }}
                  onYearChange={setYear}
                />
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={!brandId || !modelId || !year}
                  className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover disabled:opacity-50"
                >
                  {t("fitSubmit")}
                </button>
                <button
                  type="button"
                  onClick={() => setPickerOpen(false)}
                  className="text-sm font-medium text-muted-foreground hover:text-foreground"
                >
                  {t("fitCancel")}
                </button>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">{t("fitLoading")}</p>
          )}
        </div>
      )}
    </div>
  );
}
