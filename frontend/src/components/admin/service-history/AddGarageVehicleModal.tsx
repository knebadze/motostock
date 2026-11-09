"use client";

import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Modal } from "@/components/shared/Modal";
import { RemoteSearchSelect } from "@/components/shared/RemoteSearchSelect";
import { FieldError } from "@/components/shared/FieldError";
import { FormActions } from "@/components/shared/FormActions";
import { createGarageVehicleForUser } from "@/lib/api/garage";
import { searchVehicleCatalogOptions, type VehicleCatalogOption, type GarageVehicle } from "@/lib/api/vehicle-catalog";
import { ApiRequestError } from "@/lib/api/client";
import { workshopGarageVehicleFormSchema } from "@/lib/validation/workshop";
import { getFieldErrors, type FieldErrors } from "@/lib/validation/common";

function vehicleCatalogLabel(entry: VehicleCatalogOption): string {
  const year =
    entry.yearFrom || entry.yearTo ? ` (${entry.yearFrom ?? "?"}–${entry.yearTo ?? "?"})` : "";
  return `${entry.brand.name} ${entry.model.name}${year}`;
}

// Searched on the server — the page no longer embeds the whole catalog.
async function searchCatalogOptions(query: string) {
  return (await searchVehicleCatalogOptions(query)).map((entry) => ({
    value: String(entry.id),
    label: vehicleCatalogLabel(entry),
  }));
}

export function AddGarageVehicleModal({
  open,
  onClose,
  onCreated,
  userId,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (vehicle: GarageVehicle) => void;
  userId: number;
}) {
  const [vehicleCatalogId, setVehicleCatalogId] = useState("");
  const [year, setYear] = useState("");
  const [vin, setVin] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    const result = workshopGarageVehicleFormSchema.safeParse({ vehicleCatalogId, year, vin });
    if (!result.success) {
      setErrors(getFieldErrors(result.error));
      return;
    }
    setErrors({});

    setLoading(true);
    try {
      const vehicle = await createGarageVehicleForUser(userId, {
        vehicleCatalogId: Number(result.data.vehicleCatalogId),
        year: Number(result.data.year),
        vin: result.data.vin?.trim() || null,
      });
      toast.success("ტრანსპორტი დაემატა");
      onCreated(vehicle);
      onClose();
    } catch (error) {
      const message = error instanceof ApiRequestError ? error.message : "დამატება ვერ მოხერხდა";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="ტრანსპორტის დამატება">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="workshop-vehicle-catalog" className="text-sm font-medium">
            ტექნიკა *
          </label>
          <RemoteSearchSelect
            id="workshop-vehicle-catalog"
            search={searchCatalogOptions}
            value={vehicleCatalogId}
            onChange={setVehicleCatalogId}
            placeholder="მოძებნეთ ტექნიკა კატალოგიდან"
          />
          <FieldError message={errors.vehicleCatalogId} />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="workshop-vehicle-year" className="text-sm font-medium">
            წელი *
          </label>
          <input
            id="workshop-vehicle-year"
            value={year}
            onChange={(event) => setYear(event.target.value)}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          />
          <FieldError message={errors.year} />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="workshop-vehicle-vin" className="text-sm font-medium">
            VIN
          </label>
          <input
            id="workshop-vehicle-vin"
            value={vin}
            onChange={(event) => setVin(event.target.value)}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          />
          <FieldError message={errors.vin} />
        </div>

        <FormActions onCancel={onClose} loading={loading} submitLabel="დამატება" />
      </form>
    </Modal>
  );
}
