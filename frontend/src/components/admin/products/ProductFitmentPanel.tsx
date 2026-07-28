"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Select } from "@/components/shared/Select";
import { DataTable, type DataTableColumn } from "@/components/shared/DataTable";
import {
  createProductFitment,
  deleteProductFitment,
  listProductFitments,
  type ProductFitment,
} from "@/lib/api/product-fitment";
import type { VehicleCatalogEntry } from "@/lib/api/vehicle-catalog";
import { ApiRequestError } from "@/lib/api/client";

function vehicleCatalogLabel(entry: VehicleCatalogEntry): string {
  const year =
    entry.yearFrom || entry.yearTo ? ` (${entry.yearFrom ?? "?"}–${entry.yearTo ?? "?"})` : "";
  const variant = entry.variant ? ` — ${entry.variant}` : "";
  return `${entry.brand.name.ka} ${entry.model.name.ka}${variant}${year}`;
}

const columns: DataTableColumn<ProductFitment>[] = [
  {
    header: "ტექნიკა",
    render: (fitment) => {
      const year =
        fitment.vehicleCatalog.yearFrom || fitment.vehicleCatalog.yearTo
          ? ` (${fitment.vehicleCatalog.yearFrom ?? "?"}–${fitment.vehicleCatalog.yearTo ?? "?"})`
          : "";
      const variant = fitment.vehicleCatalog.variant ? ` — ${fitment.vehicleCatalog.variant}` : "";
      return `${fitment.vehicleCatalog.brand.name.ka} ${fitment.vehicleCatalog.model.name.ka}${variant}${year}`;
    },
  },
];

export function ProductFitmentPanel({
  productId,
  vehicleCatalog,
}: {
  productId: number;
  vehicleCatalog: VehicleCatalogEntry[];
}) {
  const [fitments, setFitments] = useState<ProductFitment[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [vehicleCatalogId, setVehicleCatalogId] = useState("");
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    let cancelled = false;

    listProductFitments(productId)
      .then((items) => {
        if (!cancelled) setFitments(items);
      })
      .catch(() => {
        toast.error("თავსებადობის ჩატვირთვა ვერ მოხერხდა");
      })
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });

    return () => {
      cancelled = true;
    };
  }, [productId]);

  const attachedIds = new Set(fitments.map((fitment) => fitment.vehicleCatalog.id));
  const options = useMemo(
    () =>
      vehicleCatalog
        .filter((entry) => !attachedIds.has(entry.id))
        .map((entry) => ({ value: String(entry.id), label: vehicleCatalogLabel(entry) })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [vehicleCatalog, fitments],
  );

  async function refresh() {
    setFitments(await listProductFitments(productId));
  }

  async function handleAdd() {
    if (!vehicleCatalogId) {
      toast.error("აირჩიეთ ტექნიკა");
      return;
    }

    setAdding(true);
    try {
      await createProductFitment(productId, Number(vehicleCatalogId));
      setVehicleCatalogId("");
      await refresh();
      toast.success("თავსებადობა დაემატა");
    } catch (error) {
      const message =
        error instanceof ApiRequestError ? error.message : "დამატება ვერ მოხერხდა";
      toast.error(message);
    } finally {
      setAdding(false);
    }
  }

  async function handleDelete(fitment: ProductFitment) {
    try {
      await deleteProductFitment(productId, fitment.id);
      await refresh();
      toast.success("თავსებადობა წაიშალა");
    } catch (error) {
      const message = error instanceof ApiRequestError ? error.message : "წაშლა ვერ მოხერხდა";
      toast.error(message);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-muted-foreground">
        მიუთითეთ ტექნიკის კატალოგის ჩანაწერები, რომლებთანაც ეს პროდუქტი თავსებადია (მაგ.
        კონკრეტული ნაწილი ერგება მხოლოდ გარკვეულ მოდელს/წელს). არასავალდებულოა.
      </p>

      {loaded && (
        <DataTable
          columns={columns}
          data={fitments}
          getRowKey={(fitment) => fitment.id}
          emptyMessage="თავსებადობა არ არის დამატებული"
          actions={(fitment) => (
            <button
              type="button"
              onClick={() => handleDelete(fitment)}
              className="rounded-full px-3 py-1 text-xs font-semibold text-red-600 transition-colors hover:bg-red-500/10"
            >
              წაშლა
            </button>
          )}
        />
      )}

      <div className="flex gap-3">
        <div className="flex-1">
          <Select
            options={options}
            value={vehicleCatalogId}
            onChange={setVehicleCatalogId}
            searchable
            placeholder="აირჩიეთ ტექნიკა კატალოგიდან"
          />
        </div>
        <button
          type="button"
          onClick={handleAdd}
          disabled={adding}
          className="rounded-full border border-border px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:border-primary hover:text-primary disabled:opacity-50"
        >
          + დამატება
        </button>
      </div>
    </div>
  );
}

export type DraftFitment = { vehicleCatalogId: number };

// Used while creating a brand-new product: fitment links are held locally
// and created right after the product is saved (no productId to attach to
// yet) — mirrors the DraftOptionsEditor/pending-image patterns used
// elsewhere in this same create flow.
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
        პროდუქტთან ერთად შეინახება. არასავალდებულოა.
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
