"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Modal } from "@/components/shared/Modal";
import { Select, type SelectOption } from "@/components/shared/Select";
import { FormActions } from "@/components/shared/FormActions";
import { RichTextEditor } from "@/components/shared/RichTextEditor";
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
import { flattenTree } from "@/lib/categories-tree";

function toNullableInt(value: string): number | null {
  return value.trim() === "" ? null : Number(value);
}

function toInputValue(value: number | null | undefined): string {
  return value == null ? "" : String(value);
}

function lookupOptions(items: LookupItem[]): SelectOption[] {
  return items.map((item) => ({ value: String(item.id), label: item.nameKa }));
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

  useEffect(() => {
    return () => {
      if (imageFile && previewUrl) URL.revokeObjectURL(previewUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewUrl]);

  const categoryOptions = useMemo(
    () => [
      { value: "", label: "ყველა ტიპი" },
      ...flattenTree(categories).map((category) => ({
        value: String(category.id),
        label: `${"— ".repeat(category.depth)}${category.name.ka}`,
      })),
    ],
    [categories],
  );

  const brandOptions = useMemo(
    () => brands.map((brand) => ({ value: String(brand.id), label: brand.name.ka })),
    [brands],
  );

  const powertrainOptions = useMemo(() => lookupOptions(powertrainTypes), [powertrainTypes]);

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

    if (!brandId || !modelId) {
      toast.error("აირჩიეთ მარკა და მოდელი");
      return;
    }

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

  const mainTabContent = (
    <>
      <div className="grid gap-4 sm:grid-cols-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">ტიპი (ფილტრი)</label>
            <Select
              options={categoryOptions}
              value={categoryFilter}
              onChange={handleCategoryFilterChange}
              searchable
              placeholder="ყველა ტიპი"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">მარკა</label>
            <Select
              options={brandOptions}
              value={brandId}
              onChange={handleBrandChange}
              searchable
              placeholder="აირჩიეთ მარკა"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">მოდელი</label>
            <Select
              options={modelOptions}
              value={modelId}
              onChange={handleModelChange}
              searchable
              disabled={!brandId}
              placeholder={brandId ? "აირჩიეთ მოდელი" : "ჯერ აირჩიეთ მარკა"}
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="vc-variant" className="text-sm font-medium">
            ვარიანტი / კომპლექტაცია
          </label>
          <input
            id="vc-variant"
            type="text"
            value={variant}
            onChange={(event) => setVariant(event.target.value)}
            placeholder="მაგ. ABS, Special Edition (არასავალდებულო)"
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          />
          <p className="text-xs text-muted-foreground">
            გამოიყენეთ, თუ ერთი და იმავე მოდელის რამდენიმე კონფიგურაცია გაქვთ კატალოგში
            (განსხვავებული სპეც-მონაცემებით).
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">ძრავის ტიპი</label>
            <Select
              options={powertrainOptions}
              value={powertrainTypeId}
              onChange={setPowertrainTypeId}
              placeholder="— არცერთი —"
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-5">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="vc-year-from" className="text-sm font-medium">
              წელი (დან)
            </label>
            <input
              id="vc-year-from"
              type="number"
              value={yearFrom}
              onChange={(event) => setYearFrom(event.target.value)}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="vc-year-to" className="text-sm font-medium">
              წელი (მდე)
            </label>
            <input
              id="vc-year-to"
              type="number"
              value={yearTo}
              onChange={(event) => setYearTo(event.target.value)}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </div>
          {isElectric ? (
            <>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="vc-motor-watt" className="text-sm font-medium">
                  ძრავის სიმძლავრე (ვტ)
                </label>
                <input
                  id="vc-motor-watt"
                  type="number"
                  value={motorPowerWatt}
                  onChange={(event) => setMotorPowerWatt(event.target.value)}
                  className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="vc-battery-wh" className="text-sm font-medium">
                  აკუმულატორი (Wh)
                </label>
                <input
                  id="vc-battery-wh"
                  type="number"
                  value={batteryCapacityWh}
                  onChange={(event) => setBatteryCapacityWh(event.target.value)}
                  className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="vc-range-km" className="text-sm font-medium">
                  სავალი მანძილი (კმ)
                </label>
                <input
                  id="vc-range-km"
                  type="number"
                  value={rangeKm}
                  onChange={(event) => setRangeKm(event.target.value)}
                  className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="vc-charging-time" className="text-sm font-medium">
                  დამუხტვის დრო (წთ)
                </label>
                <input
                  id="vc-charging-time"
                  type="number"
                  value={chargingTimeMinutes}
                  onChange={(event) => setChargingTimeMinutes(event.target.value)}
                  className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                />
              </div>
            </>
          ) : (
            <>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="vc-engine-cc" className="text-sm font-medium">
                  მოცულობა (cc)
                </label>
                <input
                  id="vc-engine-cc"
                  type="number"
                  value={engineVolumeCc}
                  onChange={(event) => setEngineVolumeCc(event.target.value)}
                  className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="vc-power-hp" className="text-sm font-medium">
                  სიმძლავრე (ც.ძ)
                </label>
                <input
                  id="vc-power-hp"
                  type="number"
                  value={enginePowerHp}
                  onChange={(event) => setEnginePowerHp(event.target.value)}
                  className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="vc-cylinders" className="text-sm font-medium">
                  ცილინდრები
                </label>
                <input
                  id="vc-cylinders"
                  type="number"
                  value={cylinderCount}
                  onChange={(event) => setCylinderCount(event.target.value)}
                  className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="vc-gears" className="text-sm font-medium">
                  გადაცემები
                </label>
                <input
                  id="vc-gears"
                  type="number"
                  value={gearCount}
                  onChange={(event) => setGearCount(event.target.value)}
                  className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                />
              </div>
            </>
          )}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="vc-seats" className="text-sm font-medium">
              ადგილები
            </label>
            <input
              id="vc-seats"
              type="number"
              value={seatCount}
              onChange={(event) => setSeatCount(event.target.value)}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          {!isElectric && (
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">საწვავის ტიპი</label>
              <Select
                options={lookupOptions(fuelTypes)}
                value={fuelTypeId}
                onChange={setFuelTypeId}
                searchable
                placeholder="— არცერთი —"
              />
            </div>
          )}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">გადაცემათა კოლოფი</label>
            <Select
              options={lookupOptions(transmissionTypes)}
              value={transmissionTypeId}
              onChange={setTransmissionTypeId}
              searchable
              placeholder="— არცერთი —"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">გაგრილება</label>
            <Select
              options={lookupOptions(coolingTypes)}
              value={coolingTypeId}
              onChange={setCoolingTypeId}
              searchable
              placeholder="— არცერთი —"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">საბოლოო გადაცემა</label>
            <Select
              options={lookupOptions(finalDriveTypes)}
              value={finalDriveTypeId}
              onChange={setFinalDriveTypeId}
              searchable
              placeholder="— არცერთი —"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">წამყვანი თვლები</label>
            <Select
              options={lookupOptions(driveTypes)}
              value={driveTypeId}
              onChange={setDriveTypeId}
              searchable
              placeholder="— არცერთი —"
            />
          </div>
          {!isElectric && (
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">გაშვების სისტემა</label>
              <Select
                options={lookupOptions(startTypes)}
                value={startTypeId}
                onChange={setStartTypeId}
                searchable
                placeholder="— არცერთი —"
              />
            </div>
          )}
          <label className="flex items-center gap-2 self-end pb-2 text-sm font-medium">
            <input
              type="checkbox"
              checked={hasLockingDifferential}
              onChange={(event) => setHasLockingDifferential(event.target.checked)}
              className="size-4 rounded border-border accent-primary"
            />
            დიფერენციალის ბლოკირება
          </label>
        </div>
    </>
  );

  const descriptionTabContent = (
    <>
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium">აღწერა (ქართულად)</label>
        <RichTextEditor value={descriptionKa} onChange={setDescriptionKa} />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium">აღწერა (ინგლისურად)</label>
        <RichTextEditor value={descriptionEn} onChange={setDescriptionEn} />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium">აღწერა (რუსულად)</label>
        <RichTextEditor value={descriptionRu} onChange={setDescriptionRu} />
      </div>
    </>
  );

  const imageTabContent = (
    <div className="flex flex-col gap-1.5">
      <label htmlFor="vc-image" className="text-sm font-medium">
        სურათი
      </label>
      {previewUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={previewUrl}
          alt=""
          className="h-24 w-24 rounded-lg border border-border object-cover"
        />
      )}
      <input
        id="vc-image"
        type="file"
        accept="image/*"
        onChange={handleImageChange}
        className="text-sm text-muted-foreground file:mr-3 file:rounded-full file:border-0 file:bg-muted file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-foreground hover:file:bg-border"
      />
    </div>
  );

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
            { key: "main", label: "ძირითადი", content: mainTabContent },
            { key: "description", label: "აღწერა", content: descriptionTabContent },
            { key: "image", label: "სურათი", content: imageTabContent },
          ]}
        />

        <FormActions onCancel={onClose} loading={loading} />
      </form>
    </Modal>
  );
}
