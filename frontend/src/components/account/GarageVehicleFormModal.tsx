"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { Modal } from "@/components/shared/Modal";
import { Select } from "@/components/shared/Select";
import { FieldError } from "@/components/shared/FieldError";
import { FormActions } from "@/components/shared/FormActions";
import { Loader } from "@/components/shared/Loader";
import { createGarageVehicle } from "@/lib/api/garage";
import {
  submitVehicleCatalogEntry,
  type GarageVehicle,
  type VehicleCatalogEntry,
} from "@/lib/api/vehicle-catalog";
import { decodeVin } from "@/lib/api/vin-decode";
import type { Model } from "@/lib/api/models";
import type { LookupItem } from "@/lib/api/lookups";
import { ApiRequestError } from "@/lib/api/client";
import { resolveApiErrorMessage } from "@/lib/api-errors";
import { formatVehicleCatalogLabel } from "@/lib/format";
import {
  createGarageCatalogPickFormSchema,
  createGarageSubmitFormSchema,
} from "@/lib/validation/garage";
import { getFieldErrors, type FieldErrors } from "@/lib/validation/common";

type Mode = "pick" | "submit";

export function GarageVehicleFormModal({
  open,
  onClose,
  onSaved,
  vehicleCatalog,
  models,
  fuelTypes,
  transmissionTypes,
  vinDecodeEnabled,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: (vehicle: GarageVehicle) => void;
  vehicleCatalog: VehicleCatalogEntry[];
  models: Model[];
  fuelTypes: LookupItem[];
  transmissionTypes: LookupItem[];
  vinDecodeEnabled: boolean;
}) {
  const locale = useLocale() as "ka" | "en" | "ru";
  const t = useTranslations("Account.garage");
  const tCommon = useTranslations("Common");
  const tErrors = useTranslations("ApiErrors");
  const [mode, setMode] = useState<Mode>("pick");

  // Shared across both modes — deciding "what kind of vehicle" comes first
  // regardless of whether the user then picks an existing catalog entry or
  // self-submits a new one, so switching modes keeps this selection.
  const [categoryId, setCategoryId] = useState("");

  // Also shared — VIN identifies one physical vehicle regardless of whether
  // its catalog entry is picked or self-submitted.
  const [vin, setVin] = useState("");
  const [decodingVin, setDecodingVin] = useState(false);

  const [vehicleCatalogId, setVehicleCatalogId] = useState("");
  const [pickYear, setPickYear] = useState("");

  const [brandId, setBrandId] = useState("");
  const [modelId, setModelId] = useState("");
  const [variant, setVariant] = useState("");
  const [yearFrom, setYearFrom] = useState("");
  const [yearTo, setYearTo] = useState("");
  const [submitYear, setSubmitYear] = useState("");
  const [engineVolumeCc, setEngineVolumeCc] = useState("");
  const [enginePowerHp, setEnginePowerHp] = useState("");
  const [fuelTypeId, setFuelTypeId] = useState("");
  const [transmissionTypeId, setTransmissionTypeId] = useState("");

  const [errors, setErrors] = useState<FieldErrors>({});
  const [loading, setLoading] = useState(false);

  function handleCategoryChange(nextCategoryId: string) {
    setCategoryId(nextCategoryId);
    setVehicleCatalogId("");
    setBrandId("");
    setModelId("");
  }

  function handleBrandChange(nextBrandId: string) {
    setBrandId(nextBrandId);
    setModelId("");
  }

  function selectSuggestedEntry(entry: VehicleCatalogEntry) {
    setMode("pick");
    setVehicleCatalogId(String(entry.id));
    if (!pickYear && submitYear) setPickYear(submitYear);
  }

  async function handleFillFromVin() {
    setDecodingVin(true);
    try {
      const result = await decodeVin(vin.trim());
      if (mode === "pick") {
        if (result.year != null) setPickYear(String(result.year));
      } else {
        if (result.year != null) setSubmitYear(String(result.year));
        if (result.engineVolumeCc != null) setEngineVolumeCc(String(result.engineVolumeCc));
        if (result.enginePowerHp != null) setEnginePowerHp(String(result.enginePowerHp));
      }
      toast.success(t("vinDecodeSuccess"));
    } catch (error) {
      toast.error(resolveApiErrorMessage(error, tErrors, t("vinDecodeError")));
    } finally {
      setDecodingVin(false);
    }
  }

  const nameKey = locale === "ka" ? "nameKa" : locale === "ru" ? "nameRu" : "nameEn";

  // Every option below is derived from `models`/`vehicleCatalog` (already
  // loaded for the page) rather than fetched per-selection — a user can only
  // ever pick an existing brand/model/catalog entry here, never create a new
  // one, so the full lists already contain every valid choice.
  const categoryOptions = useMemo(() => {
    const byId = new Map<number, Model["category"]>();
    for (const model of models) {
      if (!byId.has(model.categoryId)) byId.set(model.categoryId, model.category);
    }
    return Array.from(byId.values())
      .map((category) => ({ value: String(category.id), label: category.name[locale] }))
      .sort((a, b) => a.label.localeCompare(b.label, locale));
  }, [models, locale]);

  const vehicleCatalogOptions = useMemo(
    () =>
      vehicleCatalog
        .filter((entry) => String(entry.category.id) === categoryId)
        .map((entry) => ({ value: String(entry.id), label: formatVehicleCatalogLabel(entry) })),
    [vehicleCatalog, categoryId],
  );

  const brandOptions = useMemo(() => {
    const byId = new Map<number, Model["brand"]>();
    for (const model of models) {
      if (String(model.categoryId) !== categoryId) continue;
      if (!byId.has(model.brandId)) byId.set(model.brandId, model.brand);
    }
    return Array.from(byId.values())
      .map((brand) => ({ value: String(brand.id), label: brand.name }))
      .sort((a, b) => a.label.localeCompare(b.label, locale));
  }, [models, categoryId, locale]);

  const modelOptions = useMemo(
    () =>
      models
        .filter((model) => String(model.categoryId) === categoryId && String(model.brandId) === brandId)
        .map((model) => ({ value: String(model.id), label: model.name }))
        .sort((a, b) => a.label.localeCompare(b.label, locale)),
    [models, categoryId, brandId, locale],
  );

  const fuelTypeOptions = fuelTypes.map((item) => ({ value: String(item.id), label: item[nameKey] }));
  const transmissionTypeOptions = transmissionTypes.map((item) => ({
    value: String(item.id),
    label: item[nameKey],
  }));

  // Live duplicate check: as soon as brand+model are chosen in the
  // self-submit flow, surface any catalog entries that already exist for
  // that combination (any variant/year) so the user can pick one instead of
  // risking a duplicate submission.
  const similarEntries = useMemo(
    () =>
      brandId && modelId
        ? vehicleCatalog.filter(
            (entry) => String(entry.brand.id) === brandId && String(entry.model.id) === modelId,
          )
        : [],
    [vehicleCatalog, brandId, modelId],
  );

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    if (mode === "pick") {
      const schema = createGarageCatalogPickFormSchema(t);
      const result = schema.safeParse({ vehicleCatalogId, year: pickYear });
      if (!result.success) {
        setErrors(getFieldErrors(result.error));
        return;
      }
      setErrors({});
      setLoading(true);
      try {
        const vehicle = await createGarageVehicle({
          vehicleCatalogId: Number(result.data.vehicleCatalogId),
          year: Number(result.data.year),
          vin: vin.trim() || null,
        });
        toast.success(t("addSuccess"));
        onSaved(vehicle);
        onClose();
      } catch (error) {
        toast.error(resolveApiErrorMessage(error, tErrors, t("addError")));
      } finally {
        setLoading(false);
      }
      return;
    }

    const schema = createGarageSubmitFormSchema(t);
    const result = schema.safeParse({
      brandId,
      modelId,
      variant,
      yearFrom,
      yearTo,
      year: submitYear,
      engineVolumeCc,
      enginePowerHp,
      fuelTypeId,
      transmissionTypeId,
    });
    if (!result.success) {
      setErrors(getFieldErrors(result.error));
      return;
    }
    setErrors({});
    setLoading(true);
    const submittedYearFrom = result.data.yearFrom.trim() ? Number(result.data.yearFrom) : null;
    const submittedYearTo = result.data.yearTo.trim() ? Number(result.data.yearTo) : null;
    try {
      const vehicle = await submitVehicleCatalogEntry({
        brandId: Number(result.data.brandId),
        modelId: Number(result.data.modelId),
        variant: result.data.variant || undefined,
        yearFrom: submittedYearFrom,
        yearTo: submittedYearTo,
        year: Number(result.data.year),
        vin: vin.trim() || null,
        engineVolumeCc: result.data.engineVolumeCc ? Number(result.data.engineVolumeCc) : null,
        enginePowerHp: result.data.enginePowerHp ? Number(result.data.enginePowerHp) : null,
        fuelTypeId: result.data.fuelTypeId ? Number(result.data.fuelTypeId) : null,
        transmissionTypeId: result.data.transmissionTypeId
          ? Number(result.data.transmissionTypeId)
          : null,
      });
      toast.success(t("addSuccess"));
      onSaved(vehicle);
      onClose();
    } catch (error) {
      // The backend rejects an exact model+variant+yearFrom+yearTo duplicate
      // outright (409) — rather than surface that as a raw error, fall back
      // to treating it the same as if the user had picked the existing
      // entry themselves, since that's functionally what they were trying
      // to do.
      const existing =
        error instanceof ApiRequestError && error.status === 409
          ? vehicleCatalog.find(
              (entry) =>
                String(entry.brand.id) === brandId &&
                String(entry.model.id) === modelId &&
                entry.variant === (result.data.variant ?? "") &&
                entry.yearFrom === submittedYearFrom &&
                entry.yearTo === submittedYearTo,
            )
          : undefined;

      if (existing) {
        try {
          const vehicle = await createGarageVehicle({
            vehicleCatalogId: existing.id,
            year: Number(result.data.year),
            vin: vin.trim() || null,
          });
          toast.success(t("existingUsedInfo"));
          onSaved(vehicle);
          onClose();
        } catch (fallbackError) {
          toast.error(resolveApiErrorMessage(fallbackError, tErrors, t("addError")));
        }
      } else {
        toast.error(resolveApiErrorMessage(error, tErrors, t("addError")));
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t("modalTitle")}
      size="xl"
      closeLabel={tCommon("modal.close")}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="garage-category" className="text-sm font-medium">
            {t("categoryLabel")}
          </label>
          <Select
            id="garage-category"
            options={categoryOptions}
            value={categoryId}
            onChange={handleCategoryChange}
            searchable
            placeholder={t("categoryPlaceholder")}
            searchPlaceholder={tCommon("select.search")}
            emptyLabel={tCommon("select.empty")}
          />
        </div>

        {vinDecodeEnabled && (
          <div className="flex flex-col gap-1.5">
            <label htmlFor="garage-vin" className="text-sm font-medium">
              {t("vinLabel")}
            </label>
            <div className="flex gap-2">
              <input
                id="garage-vin"
                type="text"
                value={vin}
                onChange={(event) => setVin(event.target.value.toUpperCase())}
                placeholder={t("vinPlaceholder")}
                maxLength={17}
                className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm font-mono uppercase outline-none focus:border-primary"
              />
              <button
                type="button"
                onClick={handleFillFromVin}
                disabled={decodingVin || vin.trim().length !== 17}
                className="flex items-center gap-2 whitespace-nowrap rounded-lg border border-primary px-3 py-2 text-sm font-semibold text-primary transition-colors hover:bg-primary/10 disabled:opacity-50"
              >
                {decodingVin && <Loader size="xs" label={tCommon("loader.loading")} />}
                {decodingVin ? t("vinDecoding") : t("fillWithVin")}
              </button>
            </div>
          </div>
        )}

        {mode === "pick" ? (
          <>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="garage-catalog" className="text-sm font-medium">
                {t("catalogLabel")}
              </label>
              <Select
                id="garage-catalog"
                options={vehicleCatalogOptions}
                value={vehicleCatalogId}
                onChange={setVehicleCatalogId}
                searchable
                disabled={!categoryId}
                placeholder={categoryId ? t("catalogPlaceholder") : t("selectCategoryFirst")}
                searchPlaceholder={tCommon("select.search")}
                emptyLabel={tCommon("select.empty")}
              />
              <FieldError message={errors.vehicleCatalogId} />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="garage-pick-year" className="text-sm font-medium">
                {t("yearLabel")}
              </label>
              <input
                id="garage-pick-year"
                type="number"
                value={pickYear}
                onChange={(event) => setPickYear(event.target.value)}
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              />
              <FieldError message={errors.year} />
            </div>

            <button
              type="button"
              onClick={() => setMode("submit")}
              className="self-start text-sm font-medium text-primary hover:underline"
            >
              {t("cantFindMine")}
            </button>
          </>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="garage-brand" className="text-sm font-medium">
                  {t("brandLabel")}
                </label>
                <Select
                  id="garage-brand"
                  options={brandOptions}
                  value={brandId}
                  onChange={handleBrandChange}
                  searchable
                  disabled={!categoryId}
                  placeholder={categoryId ? t("brandPlaceholder") : t("selectCategoryFirst")}
                  searchPlaceholder={tCommon("select.search")}
                  emptyLabel={tCommon("select.empty")}
                />
                <FieldError message={errors.brandId} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="garage-model" className="text-sm font-medium">
                  {t("modelLabel")}
                </label>
                <Select
                  id="garage-model"
                  options={modelOptions}
                  value={modelId}
                  onChange={setModelId}
                  searchable
                  disabled={!brandId}
                  placeholder={brandId ? t("modelPlaceholder") : t("modelSelectBrandFirst")}
                  searchPlaceholder={tCommon("select.search")}
                  emptyLabel={tCommon("select.empty")}
                />
                <FieldError message={errors.modelId} />
              </div>
            </div>

            {similarEntries.length > 0 && (
              <div className="flex flex-col gap-2 rounded-lg border border-primary/30 bg-primary/5 p-3">
                <p className="text-sm font-medium">{t("similarFoundTitle")}</p>
                <div className="flex flex-wrap gap-2">
                  {similarEntries.map((entry) => (
                    <button
                      key={entry.id}
                      type="button"
                      onClick={() => selectSuggestedEntry(entry)}
                      className="rounded-full border border-primary/40 bg-card px-3 py-1.5 text-sm font-medium text-primary transition-colors hover:bg-primary/10"
                    >
                      {formatVehicleCatalogLabel(entry)}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <label htmlFor="garage-variant" className="text-sm font-medium">
                {t("variantLabel")}
              </label>
              <input
                id="garage-variant"
                type="text"
                value={variant}
                onChange={(event) => setVariant(event.target.value)}
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              />
              <FieldError message={errors.variant} />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="garage-year-from" className="text-sm font-medium">
                  {t("yearFromLabel")}
                </label>
                <input
                  id="garage-year-from"
                  type="number"
                  value={yearFrom}
                  onChange={(event) => setYearFrom(event.target.value)}
                  className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                />
                <FieldError message={errors.yearFrom} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="garage-year-to" className="text-sm font-medium">
                  {t("yearToLabel")}
                </label>
                <input
                  id="garage-year-to"
                  type="number"
                  value={yearTo}
                  onChange={(event) => setYearTo(event.target.value)}
                  className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                />
                <FieldError message={errors.yearTo} />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="garage-submit-year" className="text-sm font-medium">
                {t("vehicleYearLabel")}
              </label>
              <input
                id="garage-submit-year"
                type="number"
                value={submitYear}
                onChange={(event) => setSubmitYear(event.target.value)}
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              />
              <FieldError message={errors.year} />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="garage-engine-volume" className="text-sm font-medium">
                  {t("engineVolumeLabel")}
                </label>
                <input
                  id="garage-engine-volume"
                  type="number"
                  value={engineVolumeCc}
                  onChange={(event) => setEngineVolumeCc(event.target.value)}
                  className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                />
                <FieldError message={errors.engineVolumeCc} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="garage-engine-power" className="text-sm font-medium">
                  {t("enginePowerLabel")}
                </label>
                <input
                  id="garage-engine-power"
                  type="number"
                  value={enginePowerHp}
                  onChange={(event) => setEnginePowerHp(event.target.value)}
                  className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                />
                <FieldError message={errors.enginePowerHp} />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="garage-fuel-type" className="text-sm font-medium">
                  {t("fuelTypeLabel")}
                </label>
                <Select
                  id="garage-fuel-type"
                  options={fuelTypeOptions}
                  value={fuelTypeId}
                  onChange={setFuelTypeId}
                  placeholder={t("optionalPlaceholder")}
                  emptyLabel={tCommon("select.empty")}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="garage-transmission-type" className="text-sm font-medium">
                  {t("transmissionTypeLabel")}
                </label>
                <Select
                  id="garage-transmission-type"
                  options={transmissionTypeOptions}
                  value={transmissionTypeId}
                  onChange={setTransmissionTypeId}
                  placeholder={t("optionalPlaceholder")}
                  emptyLabel={tCommon("select.empty")}
                />
              </div>
            </div>

            <button
              type="button"
              onClick={() => setMode("pick")}
              className="self-start text-sm font-medium text-primary hover:underline"
            >
              {t("backToCatalog")}
            </button>
          </>
        )}

        <FormActions
          onCancel={onClose}
          loading={loading}
          submitLabel={t("submit")}
          loadingLabel={t("submitting")}
          cancelLabel={tCommon("formActions.cancel")}
        />
      </form>
    </Modal>
  );
}
