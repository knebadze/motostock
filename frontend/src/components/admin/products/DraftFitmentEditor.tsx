"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Select } from "@/components/shared/Select";
import { DataTable, type DataTableColumn } from "@/components/shared/DataTable";
import type { VehicleCatalogEntry } from "@/lib/api/vehicle-catalog";
import { vehicleCatalogLabel } from "./ProductFitmentPanel";

export type DraftFitment = { vehicleCatalogId: number };

// Used while creating a brand-new product: fitment links are held locally
// and created right after the product is saved (no productId to attach to
// yet) — mirrors the DraftOptionsEditor/pending-image patterns used
// elsewhere in this same create flow. Fitment rules aren't offered here —
// they need a productId, so they're only addable once the product exists
// (right after saving, in the edit view).
export function DraftFitmentEditor({
  vehicleCatalog,
  fitments,
  onAdd,
  onRemove,
}: {
  vehicleCatalog: VehicleCatalogEntry[];
  fitments: DraftFitment[];
  onAdd: (vehicleCatalogId: number) => void;
  onRemove: (vehicleCatalogId: number) => void;
}) {
  const [vehicleCatalogId, setVehicleCatalogId] = useState("");

  const attachedIds = new Set(fitments.map((fitment) => fitment.vehicleCatalogId));
  const options = useMemo(
    () =>
      vehicleCatalog
        .filter((entry) => !attachedIds.has(entry.id))
        .map((entry) => ({ value: String(entry.id), label: vehicleCatalogLabel(entry) })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [vehicleCatalog, fitments],
  );

  const rows = fitments
    .map((fitment) => vehicleCatalog.find((entry) => entry.id === fitment.vehicleCatalogId))
    .filter((entry): entry is VehicleCatalogEntry => entry !== undefined);

  const draftColumns: DataTableColumn<VehicleCatalogEntry>[] = [
    { header: "ტექნიკა", render: (entry) => vehicleCatalogLabel(entry) },
  ];

  function handleAdd() {
    if (!vehicleCatalogId) {
      toast.error("აირჩიეთ ტექნიკა");
      return;
    }
    onAdd(Number(vehicleCatalogId));
    setVehicleCatalogId("");
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-muted-foreground">
        მიუთითეთ ტექნიკის კატალოგის ჩანაწერები, რომლებთანაც ეს პროდუქტი თავსებადია — ისინი
        პროდუქტთან ერთად შეინახება. თავსებადობის წესები (კატეგორია/მახასიათებელი/ყველა
        ტრანსპორტი) დაამატეთ პროდუქტის შენახვის შემდეგ. არასავალდებულოა.
      </p>

      <DataTable
        columns={draftColumns}
        data={rows}
        getRowKey={(entry) => entry.id}
        emptyMessage="თავსებადობა ჯერ არ დამატებულა"
        actions={(entry) => (
          <button
            type="button"
            onClick={() => onRemove(entry.id)}
            className="rounded-full px-3 py-1 text-xs font-semibold text-red-600 transition-colors hover:bg-red-500/10"
          >
            წაშლა
          </button>
        )}
      />

      <div className="flex gap-3">
        <div className="flex-1">
          <Select
            options={options}
            value={vehicleCatalogId}
            onChange={setVehicleCatalogId}
            searchable
            placeholder="აირჩიეთ ტექნიკა კატალოგიდან"
            ariaLabel="ტექნიკა კატალოგიდან"
          />
        </div>
        <button
          type="button"
          onClick={handleAdd}
          className="rounded-full border border-border px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:border-primary hover:text-primary"
        >
          + დამატება
        </button>
      </div>
    </div>
  );
}
