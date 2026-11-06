"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { RemoteSearchSelect } from "@/components/shared/RemoteSearchSelect";
import { DataTable, type DataTableColumn } from "@/components/shared/DataTable";
import { getVehicleCatalogOptionsByIds, searchVehicleCatalogOptions } from "@/lib/api/vehicle-catalog";
import { vehicleCatalogLabel } from "./ProductFitmentPanel";

export type DraftFitment = { vehicleCatalogId: number };

type DraftRow = { id: number; label: string };

// Used while creating a brand-new product: fitment links are held locally
// and created right after the product is saved (no productId to attach to
// yet) — mirrors the DraftOptionsEditor/pending-image patterns used
// elsewhere in this same create flow. Fitment rules aren't offered here —
// they need a productId, so they're only addable once the product exists
// (right after saving, in the edit view).
export function DraftFitmentEditor({
  fitments,
  onAdd,
  onRemove,
}: {
  fitments: DraftFitment[];
  onAdd: (vehicleCatalogId: number) => void;
  onRemove: (vehicleCatalogId: number) => void;
}) {
  const [vehicleCatalogId, setVehicleCatalogId] = useState("");
  const [pickedLabel, setPickedLabel] = useState("");
  // Labels of the drafted entries — the catalog isn't loaded into the page,
  // so a label is remembered when picked, and fetched by id for drafts this
  // component didn't pick itself (e.g. after switching tabs and back).
  const [labels, setLabels] = useState<Map<number, string>>(new Map());

  const missingKey = fitments
    .map((fitment) => fitment.vehicleCatalogId)
    .filter((id) => !labels.has(id))
    .join(",");
  useEffect(() => {
    if (!missingKey) return;
    let cancelled = false;
    getVehicleCatalogOptionsByIds(missingKey.split(",").map(Number))
      .then((entries) => {
        if (cancelled) return;
        setLabels((previous) => {
          const next = new Map(previous);
          for (const entry of entries) next.set(entry.id, vehicleCatalogLabel(entry));
          return next;
        });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [missingKey]);

  // Searched on the server; already-drafted entries are left out.
  const searchOptions = useCallback(
    async (query: string) => {
      const attachedIds = new Set(fitments.map((fitment) => fitment.vehicleCatalogId));
      return (await searchVehicleCatalogOptions(query))
        .filter((entry) => !attachedIds.has(entry.id))
        .map((entry) => ({ value: String(entry.id), label: vehicleCatalogLabel(entry) }));
    },
    [fitments],
  );

  const rows: DraftRow[] = fitments.map((fitment) => ({
    id: fitment.vehicleCatalogId,
    label: labels.get(fitment.vehicleCatalogId) ?? "…",
  }));

  const draftColumns: DataTableColumn<DraftRow>[] = [{ header: "ტექნიკა", render: (row) => row.label }];

  function handleAdd() {
    if (!vehicleCatalogId) {
      toast.error("აირჩიეთ ტექნიკა");
      return;
    }
    const id = Number(vehicleCatalogId);
    if (pickedLabel) setLabels((previous) => new Map(previous).set(id, pickedLabel));
    onAdd(id);
    setVehicleCatalogId("");
    setPickedLabel("");
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
        getRowKey={(row) => row.id}
        emptyMessage="თავსებადობა ჯერ არ დამატებულა"
        actions={(row) => (
          <button
            type="button"
            onClick={() => onRemove(row.id)}
            className="rounded-full px-3 py-1 text-xs font-semibold text-destructive transition-colors hover:bg-red-500/10"
          >
            წაშლა
          </button>
        )}
      />

      <div className="flex gap-3">
        <div className="flex-1">
          <RemoteSearchSelect
            search={searchOptions}
            value={vehicleCatalogId}
            onChange={(value, option) => {
              setVehicleCatalogId(value);
              setPickedLabel(option?.label ?? "");
            }}
            placeholder="მოძებნეთ ტექნიკა კატალოგიდან"
            ariaLabel="ტექნიკა კატალოგიდან"
          />
        </div>
        <button
          type="button"
          onClick={handleAdd}
          className="rounded-full border border-border px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:border-primary hover:text-primary-text"
        >
          + დამატება
        </button>
      </div>
    </div>
  );
}
