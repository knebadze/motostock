"use client";

import { useMemo, useRef, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Modal } from "@/components/shared/Modal";
import { Select } from "@/components/shared/Select";
import { FieldError } from "@/components/shared/FieldError";
import { FormActions } from "@/components/shared/FormActions";
import { RichTextEditor } from "@/components/shared/RichTextEditor";
import { Toggle } from "@/components/shared/Toggle";
import { Tabs } from "@/components/shared/Tabs";
import {
  createVehicleListing,
  updateVehicleListing,
  type VehicleListing,
  type VehicleListingInput,
} from "@/lib/api/vehicle-listings";
import { uploadVehicleListingImages } from "@/lib/api/vehicle-listing-images";
import type { VehicleCatalogEntry } from "@/lib/api/vehicle-catalog";
import type { LookupItem } from "@/lib/api/lookups";
import { ApiRequestError } from "@/lib/api/client";
import { VehicleListingDiscountsPanel } from "./VehicleListingDiscountsPanel";
import { VehicleListingImagesPanel } from "./VehicleListingImagesPanel";
import { vehicleListingFormSchema } from "@/lib/validation/vehicle-listing";
import { getFieldErrors, type FieldErrors } from "@/lib/validation/common";

function vehicleCatalogLabel(entry: VehicleCatalogEntry): string {
  const year =
    entry.yearFrom || entry.yearTo ? ` (${entry.yearFrom ?? "?"}–${entry.yearTo ?? "?"})` : "";
  return `${entry.brand.name.ka} ${entry.model.name.ka}${year}`;
}

function toNullableHtml(html: string): string | null {
  const isBlank = html.replace(/<[^>]*>/g, "").trim() === "";
  return isBlank ? null : html;
}

export function VehicleListingFormModal({
  open,
  onClose,
  onSaved,
  vehicleCatalog,
  conditions,
  statuses,
  colors,
  listing,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  vehicleCatalog: VehicleCatalogEntry[];
  conditions: LookupItem[];
  statuses: LookupItem[];
  colors: LookupItem[];
  listing: VehicleListing | null;
}) {
  const isEditing = listing !== null;

  // The lookup lists come back sorted alphabetically by Georgian name, not by
  // intended meaning, so picking [0] as the default is unreliable (e.g.
  // "გაყიდულია" sorts before "ხელმისაწვდომია"). Default to the specific key
  // that makes sense for a brand-new listing, falling back to the first
  // option only if that key isn't present.
  const defaultCondition = conditions.find((item) => item.key === "NEW") ?? conditions[0];
  const defaultStatus = statuses.find((item) => item.key === "AVAILABLE") ?? statuses[0];

  const [vehicleCatalogId, setVehicleCatalogId] = useState(
    listing ? String(listing.vehicleCatalog.id) : "",
  );
  const [conditionId, setConditionId] = useState(
    listing ? String(listing.condition.id) : defaultCondition ? String(defaultCondition.id) : "",
  );
  const [statusId, setStatusId] = useState(
    listing ? String(listing.status.id) : defaultStatus ? String(defaultStatus.id) : "",
  );
  const [colorId, setColorId] = useState(
    listing ? String(listing.color.id) : colors[0] ? String(colors[0].id) : "",
  );
  const [year, setYear] = useState(listing ? String(listing.year) : "");
  const [mileageKm, setMileageKm] = useState(listing?.mileageKm != null ? String(listing.mileageKm) : "");
  const [warrantyValue, setWarrantyValue] = useState(
    listing?.warrantyValue != null ? String(listing.warrantyValue) : "",
  );
  const [warrantyUnit, setWarrantyUnit] = useState(listing?.warrantyUnit ?? "");
  const [isActive, setIsActive] = useState(listing?.isActive ?? true);
  const [price, setPrice] = useState(listing ? String(listing.price) : "");
  const [stockQuantity, setStockQuantity] = useState(
    listing ? String(listing.stockQuantity) : "1",
  );
  const [descriptionKa, setDescriptionKa] = useState(listing?.descriptionKa ?? "");
  const [descriptionEn, setDescriptionEn] = useState(listing?.descriptionEn ?? "");
  const [descriptionRu, setDescriptionRu] = useState(listing?.descriptionRu ?? "");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const pendingImageFilesRef = useRef<File[]>([]);

  const vehicleCatalogOptions = useMemo(
    () => vehicleCatalog.map((entry) => ({ value: String(entry.id), label: vehicleCatalogLabel(entry) })),
    [vehicleCatalog],
  );
  const conditionOptions = conditions.map((item) => ({ value: String(item.id), label: item.nameKa }));
  const statusOptions = statuses.map((item) => ({ value: String(item.id), label: item.nameKa }));
  const colorOptions = colors.map((item) => ({ value: String(item.id), label: item.nameKa }));
  const warrantyUnitOptions = [
    { value: "", label: "—" },
    { value: "YEAR", label: "წელი" },
    { value: "MONTH", label: "თვე" },
  ];

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    const result = vehicleListingFormSchema.safeParse({
      vehicleCatalogId,
      conditionId,
      statusId,
      colorId,
      year,
      mileageKm,
      warrantyValue,
      warrantyUnit,
      price,
      stockQuantity,
    });
    if (!result.success) {
      setErrors(getFieldErrors(result.error));
      toast.error("გთხოვთ შეასწოროთ ველები");
      return;
    }
    setErrors({});

    setLoading(true);

    try {
      const input: VehicleListingInput = {
        vehicleCatalogId: Number(vehicleCatalogId),
        conditionId: Number(conditionId),
        statusId: Number(statusId),
        colorId: Number(colorId),
        year: Number(year),
        mileageKm: mileageKm ? Number(mileageKm) : null,
        warrantyValue: warrantyValue ? Number(warrantyValue) : null,
        warrantyUnit: warrantyUnit ? (warrantyUnit as "YEAR" | "MONTH") : null,
        isActive,
        price: Number(price),
        stockQuantity: stockQuantity ? Number(stockQuantity) : undefined,
        descriptionKa: toNullableHtml(descriptionKa),
        descriptionEn: toNullableHtml(descriptionEn),
        descriptionRu: toNullableHtml(descriptionRu),
      };

      const saved = isEditing
        ? await updateVehicleListing(listing.id, input)
        : await createVehicleListing(input);

      if (!isEditing && pendingImageFilesRef.current.length > 0) {
        try {
          await uploadVehicleListingImages(saved.id, pendingImageFilesRef.current);
        } catch {
          toast.error("განცხადება შენახულია, მაგრამ სურათების ატვირთვა ვერ მოხერხდა");
          onSaved();
          onClose();
          return;
        }
      }

      toast.success(isEditing ? "განცხადება განახლდა" : "განცხადება დაემატა");
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
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium">ტექნიკა *</label>
        <Select
          options={vehicleCatalogOptions}
          value={vehicleCatalogId}
          onChange={setVehicleCatalogId}
          searchable
          placeholder="აირჩიეთ ტექნიკა კატალოგიდან"
        />
        <FieldError message={errors.vehicleCatalogId} />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium">მდგომარეობა *</label>
          <Select options={conditionOptions} value={conditionId} onChange={setConditionId} />
          <FieldError message={errors.conditionId} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium">სტატუსი *</label>
          <Select options={statusOptions} value={statusId} onChange={setStatusId} />
          <FieldError message={errors.statusId} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium">ფერი *</label>
          <Select options={colorOptions} value={colorId} onChange={setColorId} searchable />
          <FieldError message={errors.colorId} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="vl-year" className="text-sm font-medium">
            გამოშვების წელი *
          </label>
          <input
            id="vl-year"
            type="number"
            value={year}
            onChange={(event) => setYear(event.target.value)}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          />
          <FieldError message={errors.year} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="vl-price" className="text-sm font-medium">
            ფასი (₾) *
          </label>
          <input
            id="vl-price"
            type="number"
            step="0.01"
            value={price}
            onChange={(event) => setPrice(event.target.value)}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          />
          <FieldError message={errors.price} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="vl-stock" className="text-sm font-medium">
            მარაგში (ცალი)
          </label>
          <input
            id="vl-stock"
            type="number"
            min={1}
            value={stockQuantity}
            onChange={(event) => setStockQuantity(event.target.value)}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          />
          <FieldError message={errors.stockQuantity} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="vl-mileage" className="text-sm font-medium">
            გარბენი (კმ)
          </label>
          <input
            id="vl-mileage"
            type="number"
            min={0}
            value={mileageKm}
            onChange={(event) => setMileageKm(event.target.value)}
            placeholder="მხოლოდ მეორადისთვის"
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          />
          <FieldError message={errors.mileageKm} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="vl-warranty-value" className="text-sm font-medium">
            გარანტია
          </label>
          <input
            id="vl-warranty-value"
            type="number"
            min={1}
            value={warrantyValue}
            onChange={(event) => setWarrantyValue(event.target.value)}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          />
          <FieldError message={errors.warrantyValue} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium">გარანტიის ერთეული</label>
          <Select options={warrantyUnitOptions} value={warrantyUnit} onChange={setWarrantyUnit} />
          <FieldError message={errors.warrantyUnit} />
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 rounded-lg border border-border p-3">
        <div>
          <p className="text-sm font-medium">აქტიურია</p>
          <p className="text-sm text-muted-foreground">
            გამორთვისას განცხადება საიტზე მომხმარებელს არ უჩანება, თუმცა ბაზაში რჩება.
          </p>
        </div>
        <Toggle checked={isActive} onChange={setIsActive} />
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

  const imagesTabContent = (
    <VehicleListingImagesPanel
      listingId={isEditing ? listing.id : null}
      onPendingFilesChange={(files) => {
        pendingImageFilesRef.current = files;
      }}
    />
  );

  const tabs = [
    { key: "main", label: "ძირითადი", content: mainTabContent },
    { key: "description", label: "აღწერა", content: descriptionTabContent },
    { key: "images", label: "სურათები", content: imagesTabContent },
    ...(isEditing
      ? [
          {
            key: "discounts",
            label: "ფასდაკლებები",
            content: (
              <VehicleListingDiscountsPanel
                listingId={listing.id}
                basePrice={Number(price) || listing.price}
              />
            ),
          },
        ]
      : []),
  ];

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="2xl"
      title={isEditing ? "განცხადების რედაქტირება" : "ახალი განცხადება"}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Tabs tabs={tabs} />

        <FormActions onCancel={onClose} loading={loading} />
      </form>
    </Modal>
  );
}
