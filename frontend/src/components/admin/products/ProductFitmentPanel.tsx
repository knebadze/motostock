"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Select } from "@/components/shared/Select";
import { DataTable, type DataTableColumn } from "@/components/shared/DataTable";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import {
  createProductFitment,
  deleteProductFitment,
  listProductFitments,
  type ProductFitment,
} from "@/lib/api/product-fitment";
import type { VehicleCatalogEntry } from "@/lib/api/vehicle-catalog";
import type { Category } from "@/lib/api/categories";
import { ApiRequestError } from "@/lib/api/client";
import { FitmentRulesEditor, type VehicleSpecLookupMap } from "./FitmentRulesEditor";

export type { VehicleSpecLookupMap };

export function vehicleCatalogLabel(entry: VehicleCatalogEntry): string {
  const year =
    entry.yearFrom || entry.yearTo ? ` (${entry.yearFrom ?? "?"}–${entry.yearTo ?? "?"})` : "";
  const variant = entry.variant ? ` — ${entry.variant}` : "";
  return `${entry.brand.name} ${entry.model.name}${variant}${year}`;
}

// fitment.vehicleCatalog is a narrower shape than VehicleCatalogEntry (no
// category/spec fields), so it can't just be passed to vehicleCatalogLabel
// above — same formatting, kept as its own function instead of duplicating
// the string-building inline a second time (once for the table column, once
// for the delete-confirmation message below).
function fitmentLabel(fitment: ProductFitment): string {
  const { vehicleCatalog } = fitment;
  const year =
    vehicleCatalog.yearFrom || vehicleCatalog.yearTo
      ? ` (${vehicleCatalog.yearFrom ?? "?"}–${vehicleCatalog.yearTo ?? "?"})`
      : "";
  const variant = vehicleCatalog.variant ? ` — ${vehicleCatalog.variant}` : "";
  return `${vehicleCatalog.brand.name} ${vehicleCatalog.model.name}${variant}${year}`;
}

const columns: DataTableColumn<ProductFitment>[] = [
  { header: "ტექნიკა", render: fitmentLabel },
];

export function ProductFitmentPanel({
  productId,
  vehicleCatalog,
  categories,
  vehicleSpecLookups,
}: {
  productId: number;
  vehicleCatalog: VehicleCatalogEntry[];
  categories: Category[];
  vehicleSpecLookups: VehicleSpecLookupMap;
}) {
  const [fitments, setFitments] = useState<ProductFitment[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [vehicleCatalogId, setVehicleCatalogId] = useState("");
  const [adding, setAdding] = useState(false);
  const [deletingFitment, setDeletingFitment] = useState<ProductFitment | null>(null);

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

  async function handleDelete() {
    if (!deletingFitment) return;
    await deleteProductFitment(productId, deletingFitment.id);
    await refresh();
  }

  return (
    <div className="flex flex-col gap-8">
      <FitmentRulesEditor
        productId={productId}
        categories={categories}
        vehicleSpecLookups={vehicleSpecLookups}
      />

      <div className="flex flex-col gap-3 border-t border-border pt-6">
        <p className="text-xs text-muted-foreground">
          ცალკეული თავსებადობა — მიუთითეთ ტექნიკის კატალოგის კონკრეტული ჩანაწერები,
          რომლებთანაც ეს პროდუქტი თავსებადია (მაგ. ერგება მხოლოდ გარკვეულ მოდელს/წელს).
          არასავალდებულოა.
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
                onClick={() => setDeletingFitment(fitment)}
                className="rounded-full px-3 py-1 text-xs font-semibold text-red-600 transition-colors hover:bg-red-500/10"
              >
                წაშლა
              </button>
            )}
          />
        )}

        <ConfirmDialog
          open={deletingFitment !== null}
          onClose={() => setDeletingFitment(null)}
          title="თავსებადობის წაშლა"
          message={
            <>
              დარწმუნებული ხართ, რომ გსურთ წაშალოთ თავსებადობა{" "}
              <span className="font-semibold text-foreground">
                {deletingFitment ? fitmentLabel(deletingFitment) : ""}
              </span>
              -თან? ამ მოქმედების გაუქმება შეუძლებელია.
            </>
          }
          successMessage="თავსებადობა წაიშალა"
          onConfirm={handleDelete}
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
            disabled={adding}
            className="rounded-full border border-border px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:border-primary hover:text-primary disabled:opacity-50"
          >
            + დამატება
          </button>
        </div>
      </div>
    </div>
  );
}
