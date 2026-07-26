"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Modal } from "@/components/shared/Modal";
import { Select, type SelectOption } from "@/components/shared/Select";
import { FormActions } from "@/components/shared/FormActions";
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
  entry: VehicleCatalogEntry | null;
}) {
  const isEditing = entry !== null;

  const [categoryId, setCategoryId] = useState(entry ? String(entry.category.id) : "");
  const [brandId, setBrandId] = useState(entry ? String(entry.brand.id) : "");
  const [modelId, setModelId] = useState(entry ? String(entry.model.id) : "");
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
    () =>
      flattenTree(categories).map((category) => ({
        value: String(category.id),
        label: `${"— ".repeat(category.depth)}${category.name.ka}`,
      })),
    [categories],
  );

  const brandOptions = useMemo(
    () => brands.map((brand) => ({ value: String(brand.id), label: brand.name.ka })),
    [brands],
  );

  const modelOptions = useMemo(
    () =>
      models
        .filter((model) => String(model.brandId) === brandId)
        .map((model) => ({ value: String(model.id), label: model.name.ka })),
    [models, brandId],
  );

  function handleBrandChange(nextBrandId: string) {
    setBrandId(nextBrandId);
    const stillValid = models.some(
      (model) => String(model.id) === modelId && String(model.brandId) === nextBrandId,
    );
    if (!stillValid) setModelId("");
  }

  function handleModelChange(nextModelId: string) {
    setModelId(nextModelId);
    // Prefill the type from the model's default (e.g. Yamaha R3 → Sport), but
    // the admin can still override it afterward.
    const model = models.find((item) => String(item.id) === nextModelId);
    if (model?.category) {
      setCategoryId(String(model.category.id));
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

    if (!categoryId || !brandId || !modelId) {
      toast.error("აირჩიეთ კატეგორია, მარკა და მოდელი");
      return;
    }

    setLoading(true);

    try {
      const input: VehicleCatalogInput = {
        categoryId: Number(categoryId),
        brandId: Number(brandId),
        modelId: Number(modelId),
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
        descriptionKa: descriptionKa.trim() || null,
        descriptionEn: descriptionEn.trim() || null,
        descriptionRu: descriptionRu.trim() || null,
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
      size="xl"
      title={isEditing ? "ტექნიკის რედაქტირება" : "ტექნიკის დამატება"}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">კატეგორია</label>
            <Select
              options={categoryOptions}
              value={categoryId}
              onChange={setCategoryId}
              searchable
              placeholder="აირჩიეთ კატეგორია"
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
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="vc-description-ka" className="text-sm font-medium">
            აღწერა (ქართულად)
          </label>
          <textarea
            id="vc-description-ka"
            rows={2}
            value={descriptionKa}
            onChange={(event) => setDescriptionKa(event.target.value)}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="vc-description-en" className="text-sm font-medium">
            აღწერა (ინგლისურად)
          </label>
          <textarea
            id="vc-description-en"
            rows={2}
            value={descriptionEn}
            onChange={(event) => setDescriptionEn(event.target.value)}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="vc-description-ru" className="text-sm font-medium">
            აღწერა (რუსულად)
          </label>
          <textarea
            id="vc-description-ru"
            rows={2}
            value={descriptionRu}
            onChange={(event) => setDescriptionRu(event.target.value)}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          />
        </div>

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

        <FormActions onCancel={onClose} loading={loading} />
      </form>
    </Modal>
  );
}
