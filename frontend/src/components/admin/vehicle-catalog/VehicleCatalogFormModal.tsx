"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Modal } from "@/components/shared/Modal";
import { FormActions } from "@/components/shared/FormActions";
import { Tabs } from "@/components/shared/Tabs";
import {
  createVehicleCatalogEntry,
  updateVehicleCatalogEntry,
  uploadVehicleCatalogImage,
  type VehicleCatalogEntry,
  type VehicleCatalogInput,
} from "@/lib/api/vehicle-catalog";
import type { Category } from "@/lib/api/categories";
import type { Brand } from "@/lib/api/brands";
import type { Model } from "@/lib/api/models";
import type { LookupItem } from "@/lib/api/lookups";
import { ApiRequestError, resolveMediaUrl } from "@/lib/api/client";
import { flattenTree, isVehicleCategory } from "@/lib/categories-tree";
import { vehicleCatalogFormSchema } from "@/lib/validation/vehicle-catalog";
import { getFieldErrors, type FieldErrors } from "@/lib/validation/common";
import { VehicleCatalogSpecsTab } from "./VehicleCatalogSpecsTab";
import { VehicleCatalogDescriptionTab } from "./VehicleCatalogDescriptionTab";
import { VehicleCatalogImageTab } from "./VehicleCatalogImageTab";

function toNullableInt(value: string): number | null {
  return value.trim() === "" ? null : Number(value);
}

function toNullableFloat(value: string): number | null {
  return value.trim() === "" ? null : Number(value);
}

function toInputValue(value: number | null | undefined): string {
  return value == null ? "" : String(value);
}

function toNullableHtml(html: string): string | null {
  const isBlank = html.replace(/<[^>]*>/g, "").trim() === "";
  return isBlank ? null : html;
}

export function VehicleCatalogFormModal({
  open,
  onClose,
  onSaved,
  categories,
  brands,
  models,
  fuelTypes,
  transmissionTypes,
  coolingTypes,
  finalDriveTypes,
  driveTypes,
  startTypes,
  powertrainTypes,
  entry,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  categories: Category[];
  brands: Brand[];
  models: Model[];
  fuelTypes: LookupItem[];
  transmissionTypes: LookupItem[];
  coolingTypes: LookupItem[];
  finalDriveTypes: LookupItem[];
  driveTypes: LookupItem[];
  startTypes: LookupItem[];
  powertrainTypes: LookupItem[];
  entry: VehicleCatalogEntry | null;
}) {
  const isEditing = entry !== null;

  // Category is not stored on the catalog entry itself (it always comes from
  // the chosen model) — this is only a local filter to narrow the model list.
  const [categoryFilter, setCategoryFilter] = useState(entry ? String(entry.category.id) : "");
  const [brandId, setBrandId] = useState(entry ? String(entry.brand.id) : "");
  const [modelId, setModelId] = useState(entry ? String(entry.model.id) : "");
  const [variant, setVariant] = useState(entry?.variant ?? "");
  const [yearFrom, setYearFrom] = useState(toInputValue(entry?.yearFrom));
  const [yearTo, setYearTo] = useState(toInputValue(entry?.yearTo));
  const [engineVolumeCc, setEngineVolumeCc] = useState(toInputValue(entry?.engineVolumeCc));
  const [enginePowerHp, setEnginePowerHp] = useState(toInputValue(entry?.enginePowerHp));
  const [cylinderCount, setCylinderCount] = useState(toInputValue(entry?.cylinderCount));
  const [gearCount, setGearCount] = useState(toInputValue(entry?.gearCount));
  const [seatCount, setSeatCount] = useState(toInputValue(entry?.seatCount));
  const [weightKg, setWeightKg] = useState(toInputValue(entry?.weightKg));
  const [seatHeightMm, setSeatHeightMm] = useState(toInputValue(entry?.seatHeightMm));
  const [fuelTankLiters, setFuelTankLiters] = useState(
    entry?.fuelTankLiters != null ? String(entry.fuelTankLiters) : "",
  );
  const [topSpeedKmh, setTopSpeedKmh] = useState(toInputValue(entry?.topSpeedKmh));
  const [hasAbs, setHasAbs] = useState(entry?.hasAbs ?? false);
  const [fuelTypeId, setFuelTypeId] = useState(toInputValue(entry?.fuelType?.id));
  const [transmissionTypeId, setTransmissionTypeId] = useState(
    toInputValue(entry?.transmissionType?.id),
  );
  const [coolingTypeId, setCoolingTypeId] = useState(toInputValue(entry?.coolingType?.id));
  const [finalDriveTypeId, setFinalDriveTypeId] = useState(
    toInputValue(entry?.finalDriveType?.id),
  );
  const [driveTypeId, setDriveTypeId] = useState(toInputValue(entry?.driveType?.id));
  const [startTypeId, setStartTypeId] = useState(toInputValue(entry?.startType?.id));
  const [powertrainTypeId, setPowertrainTypeId] = useState(
    toInputValue(entry?.powertrainType?.id),
  );
  const [motorPowerWatt, setMotorPowerWatt] = useState(toInputValue(entry?.motorPowerWatt));
  const [batteryCapacityWh, setBatteryCapacityWh] = useState(
    toInputValue(entry?.batteryCapacityWh),
  );
  const [rangeKm, setRangeKm] = useState(toInputValue(entry?.rangeKm));
  const [chargingTimeMinutes, setChargingTimeMinutes] = useState(
    toInputValue(entry?.chargingTimeMinutes),
  );
  const [hasLockingDifferential, setHasLockingDifferential] = useState(
    entry?.hasLockingDifferential ?? false,
  );
  const [descriptionKa, setDescriptionKa] = useState(entry?.descriptionKa ?? "");
  const [descriptionEn, setDescriptionEn] = useState(entry?.descriptionEn ?? "");
  const [descriptionRu, setDescriptionRu] = useState(entry?.descriptionRu ?? "");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(
    resolveMediaUrl(entry?.imageUrl ?? null),
  );
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});

  useEffect(() => {
    return () => {
      if (imageFile && previewUrl) URL.revokeObjectURL(previewUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewUrl]);

  const categoryOptions = useMemo(() => {
    // This is only a filter to narrow the model list below — but a vehicle
    // catalog entry's model is always a vehicle (transport) category, so
    // offering product categories here would just be dead weight.
    const vehicleCategories = categories.filter((category) =>
      isVehicleCategory(categories, category.id),
    );
    return [
      { value: "", label: "ყველა ტიპი" },
      ...flattenTree(vehicleCategories).map((category) => ({
        value: String(category.id),
        label: `${"— ".repeat(category.depth)}${category.name.ka}`,
      })),
    ];
  }, [categories]);

  const brandOptions = useMemo(
    () => brands.map((brand) => ({ value: String(brand.id), label: brand.name.ka })),
    [brands],
  );

  const isElectric = useMemo(
    () =>
      powertrainTypes.find((item) => String(item.id) === powertrainTypeId)?.key === "ELECTRIC",
    [powertrainTypes, powertrainTypeId],
  );

  const modelOptions = useMemo(
    () =>
      models
        .filter(
          (model) =>
            String(model.brandId) === brandId &&
            (categoryFilter === "" || String(model.category.id) === categoryFilter),
        )
        .map((model) => ({ value: String(model.id), label: model.name.ka })),
    [models, brandId, categoryFilter],
  );

  function isModelStillValid(candidateModelId: string, nextBrandId: string, nextCategoryFilter: string) {
    return models.some(
      (model) =>
        String(model.id) === candidateModelId &&
        String(model.brandId) === nextBrandId &&
        (nextCategoryFilter === "" || String(model.category.id) === nextCategoryFilter),
    );
  }

  function handleCategoryFilterChange(nextCategoryFilter: string) {
    setCategoryFilter(nextCategoryFilter);
    if (!isModelStillValid(modelId, brandId, nextCategoryFilter)) setModelId("");
  }

  function handleBrandChange(nextBrandId: string) {
    setBrandId(nextBrandId);
    if (!isModelStillValid(modelId, nextBrandId, categoryFilter)) setModelId("");
  }

  function handleModelChange(nextModelId: string) {
    setModelId(nextModelId);
    // Keep the category filter in sync with the chosen model's real category
    // (it's purely informational/derived — not sent to the backend).
    const model = models.find((item) => String(item.id) === nextModelId);
    if (model?.category) {
      setCategoryFilter(String(model.category.id));
    }
  }

  function handleImageChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    setImageFile(file);
    if (file) {
      setPreviewUrl(URL.createObjectURL(file));
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    const result = vehicleCatalogFormSchema.safeParse({
      brandId,
      modelId,
      variant,
      yearFrom,
      yearTo,
      engineVolumeCc,
      enginePowerHp,
      cylinderCount,
      gearCount,
      seatCount,
      weightKg,
      seatHeightMm,
      fuelTankLiters,
      topSpeedKmh,
      motorPowerWatt,
      batteryCapacityWh,
      rangeKm,
      chargingTimeMinutes,
    });
    if (!result.success) {
      setErrors(getFieldErrors(result.error));
      toast.error("გთხოვთ შეასწოროთ ველები");
      return;
    }
    setErrors({});

    setLoading(true);

    try {
      const input: VehicleCatalogInput = {
        brandId: Number(brandId),
        modelId: Number(modelId),
        variant: variant.trim(),
        yearFrom: toNullableInt(yearFrom),
        yearTo: toNullableInt(yearTo),
        engineVolumeCc: toNullableInt(engineVolumeCc),
        enginePowerHp: toNullableInt(enginePowerHp),
        cylinderCount: toNullableInt(cylinderCount),
        gearCount: toNullableInt(gearCount),
        seatCount: toNullableInt(seatCount),
        weightKg: toNullableInt(weightKg),
        seatHeightMm: toNullableInt(seatHeightMm),
        fuelTankLiters: toNullableFloat(fuelTankLiters),
        topSpeedKmh: toNullableInt(topSpeedKmh),
        hasAbs,
        fuelTypeId: toNullableInt(fuelTypeId),
        transmissionTypeId: toNullableInt(transmissionTypeId),
        coolingTypeId: toNullableInt(coolingTypeId),
        finalDriveTypeId: toNullableInt(finalDriveTypeId),
        driveTypeId: toNullableInt(driveTypeId),
        startTypeId: toNullableInt(startTypeId),
        powertrainTypeId: toNullableInt(powertrainTypeId),
        motorPowerWatt: toNullableInt(motorPowerWatt),
        batteryCapacityWh: toNullableInt(batteryCapacityWh),
        rangeKm: toNullableInt(rangeKm),
        chargingTimeMinutes: toNullableInt(chargingTimeMinutes),
        hasLockingDifferential,
        descriptionKa: toNullableHtml(descriptionKa),
        descriptionEn: toNullableHtml(descriptionEn),
        descriptionRu: toNullableHtml(descriptionRu),
      };

      const saved = isEditing
        ? await updateVehicleCatalogEntry(entry.id, input)
        : await createVehicleCatalogEntry(input);

      if (imageFile) {
        try {
          await uploadVehicleCatalogImage(saved.id, imageFile);
        } catch {
          toast.error("ჩანაწერი შენახულია, მაგრამ სურათის ატვირთვა ვერ მოხერხდა");
          onSaved();
          onClose();
          return;
        }
      }

      toast.success(isEditing ? "ჩანაწერი განახლდა" : "ჩანაწერი დაემატა");
      onSaved();
      onClose();
    } catch (error) {
      const message =
        error instanceof ApiRequestError ? error.message : "შენახვა ვერ მოხერხდა";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="2xl"
      title={isEditing ? "ტექნიკის რედაქტირება" : "ტექნიკის დამატება"}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Tabs
          tabs={[
            {
              key: "main",
              label: "ძირითადი",
              content: (
                <VehicleCatalogSpecsTab
                  categoryOptions={categoryOptions}
                  categoryFilter={categoryFilter}
                  onCategoryFilterChange={handleCategoryFilterChange}
                  brandOptions={brandOptions}
                  brandId={brandId}
                  onBrandChange={handleBrandChange}
                  modelOptions={modelOptions}
                  modelId={modelId}
                  onModelChange={handleModelChange}
                  variant={variant}
                  onVariantChange={setVariant}
                  powertrainTypes={powertrainTypes}
                  powertrainTypeId={powertrainTypeId}
                  onPowertrainTypeIdChange={setPowertrainTypeId}
                  isElectric={isElectric}
                  yearFrom={yearFrom}
                  onYearFromChange={setYearFrom}
                  yearTo={yearTo}
                  onYearToChange={setYearTo}
                  motorPowerWatt={motorPowerWatt}
                  onMotorPowerWattChange={setMotorPowerWatt}
                  batteryCapacityWh={batteryCapacityWh}
                  onBatteryCapacityWhChange={setBatteryCapacityWh}
                  rangeKm={rangeKm}
                  onRangeKmChange={setRangeKm}
                  chargingTimeMinutes={chargingTimeMinutes}
                  onChargingTimeMinutesChange={setChargingTimeMinutes}
                  engineVolumeCc={engineVolumeCc}
                  onEngineVolumeCcChange={setEngineVolumeCc}
                  enginePowerHp={enginePowerHp}
                  onEnginePowerHpChange={setEnginePowerHp}
                  cylinderCount={cylinderCount}
                  onCylinderCountChange={setCylinderCount}
                  gearCount={gearCount}
                  onGearCountChange={setGearCount}
                  seatCount={seatCount}
                  onSeatCountChange={setSeatCount}
                  weightKg={weightKg}
                  onWeightKgChange={setWeightKg}
                  seatHeightMm={seatHeightMm}
                  onSeatHeightMmChange={setSeatHeightMm}
                  topSpeedKmh={topSpeedKmh}
                  onTopSpeedKmhChange={setTopSpeedKmh}
                  fuelTankLiters={fuelTankLiters}
                  onFuelTankLitersChange={setFuelTankLiters}
                  hasAbs={hasAbs}
                  onHasAbsChange={setHasAbs}
                  fuelTypes={fuelTypes}
                  fuelTypeId={fuelTypeId}
                  onFuelTypeIdChange={setFuelTypeId}
                  transmissionTypes={transmissionTypes}
                  transmissionTypeId={transmissionTypeId}
                  onTransmissionTypeIdChange={setTransmissionTypeId}
                  coolingTypes={coolingTypes}
                  coolingTypeId={coolingTypeId}
                  onCoolingTypeIdChange={setCoolingTypeId}
                  finalDriveTypes={finalDriveTypes}
                  finalDriveTypeId={finalDriveTypeId}
                  onFinalDriveTypeIdChange={setFinalDriveTypeId}
                  driveTypes={driveTypes}
                  driveTypeId={driveTypeId}
                  onDriveTypeIdChange={setDriveTypeId}
                  startTypes={startTypes}
                  startTypeId={startTypeId}
                  onStartTypeIdChange={setStartTypeId}
                  hasLockingDifferential={hasLockingDifferential}
                  onHasLockingDifferentialChange={setHasLockingDifferential}
                  errors={errors}
                />
              ),
            },
            {
              key: "description",
              label: "აღწერა",
              content: (
                <VehicleCatalogDescriptionTab
                  descriptionKa={descriptionKa}
                  onDescriptionKaChange={setDescriptionKa}
                  descriptionEn={descriptionEn}
                  onDescriptionEnChange={setDescriptionEn}
                  descriptionRu={descriptionRu}
                  onDescriptionRuChange={setDescriptionRu}
                />
              ),
            },
            {
              key: "image",
              label: "სურათი",
              content: <VehicleCatalogImageTab previewUrl={previewUrl} onImageChange={handleImageChange} />,
            },
          ]}
        />

        <FormActions onCancel={onClose} loading={loading} />
      </form>
    </Modal>
  );
}
