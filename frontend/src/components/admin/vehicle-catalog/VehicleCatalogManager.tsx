"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { RowActions } from "@/components/shared/RowActions";
import { DataTable, type DataTableColumn } from "@/components/shared/DataTable";
import { Pagination } from "@/components/shared/Pagination";
import { AdminFilterPanel } from "@/components/admin/shared/AdminFilterPanel";
import {
  deleteVehicleCatalogEntry,
  listVehicleCatalog,
  type VehicleCatalogEntry,
  type VehicleCatalogPage,
} from "@/lib/api/vehicle-catalog";
import { ApiRequestError, resolveMediaUrl } from "@/lib/api/client";
import type { AdminFilterEntry } from "@/lib/api/admin-filters";
import type { Category } from "@/lib/api/categories";
import type { Brand } from "@/lib/api/brands";
import type { Model } from "@/lib/api/models";
import type { LookupItem } from "@/lib/api/lookups";
import { buildVehicleCatalogFilterFields } from "@/config/admin-filters/vehicle-catalog-filters";
import { VehicleCatalogFormModal } from "./VehicleCatalogFormModal";
import { VehicleCatalogBulkImportModal } from "./VehicleCatalogBulkImportModal";

const columns: DataTableColumn<VehicleCatalogEntry>[] = [
  {
    header: "",
    render: (entry) =>
      resolveMediaUrl(entry.imageUrl) ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={resolveMediaUrl(entry.imageUrl) ?? undefined}
          alt=""
          className="size-10 rounded-lg border border-border object-cover"
        />
      ) : (
        <div className="size-10 rounded-lg border border-dashed border-border" />
      ),
  },
  { header: "კატეგორია", render: (entry) => entry.category.name.ka },
  { header: "მარკა", render: (entry) => entry.brand.name },
  {
    header: "მოდელი",
    render: (entry) =>
      entry.variant ? `${entry.model.name} (${entry.variant})` : entry.model.name,
  },
  {
    header: "წელი",
    render: (entry) =>
      entry.yearFrom || entry.yearTo
        ? `${entry.yearFrom ?? "?"}–${entry.yearTo ?? "?"}`
        : "—",
    cellClassName: "text-muted-foreground",
  },
  {
    header: "მოცულობა",
    render: (entry) => (entry.engineVolumeCc ? `${entry.engineVolumeCc} cc` : "—"),
    cellClassName: "text-muted-foreground",
  },
  {
    header: "წონა",
    render: (entry) => (entry.weightKg ? `${entry.weightKg} კგ` : "—"),
    cellClassName: "text-muted-foreground",
  },
  {
    header: "საწვავი",
    render: (entry) => entry.fuelType?.nameKa ?? "—",
    cellClassName: "text-muted-foreground",
  },
  {
    header: "ძრავის ტიპი",
    render: (entry) => entry.powertrainType?.nameKa ?? "—",
    cellClassName: "text-muted-foreground",
  },
  {
    header: "დამატებულია",
    render: (entry) => entry.submittedBy?.name ?? "ადმინის მიერ",
    cellClassName: "text-muted-foreground",
  },
];

export function VehicleCatalogManager({
  initialData,
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
}: {
  initialData: VehicleCatalogPage;
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
}) {
  const [data, setData] = useState(initialData);
  const [formOpen, setFormOpen] = useState(false);
  const [bulkImportOpen, setBulkImportOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<VehicleCatalogEntry | null>(null);
  const [deletingEntry, setDeletingEntry] = useState<VehicleCatalogEntry | null>(null);
  const [adminFilters, setAdminFilters] = useState<AdminFilterEntry[]>([]);
  const totalPages = Math.max(1, Math.ceil(data.total / data.pageSize));

  const canCreate = categories.length > 0 && brands.length > 0 && models.length > 0;

  const filterFields = buildVehicleCatalogFilterFields({
    brands,
    models,
    categories,
    fuelTypes,
    transmissionTypes,
    coolingTypes,
    finalDriveTypes,
    driveTypes,
    startTypes,
    powertrainTypes,
  });

  async function loadPage(page: number, filters: AdminFilterEntry[] = adminFilters) {
    try {
      setData(await listVehicleCatalog(filters, page, data.pageSize));
    } catch (error) {
      const message =
        error instanceof ApiRequestError ? error.message : "სიის განახლება ვერ მოხერხდა";
      toast.error(message);
    }
  }

  // refresh() re-fetches the current page under the current filters — used
  // after create/edit/delete/bulk-import, where the page shouldn't change.
  async function refresh() {
    await loadPage(data.page);
  }

  // AdminFilterPanel only calls this once, on "გაფილტვრა" — one click, one
  // request, never on every keystroke. A new filter always resets to page 1.
  async function handleFilterApply(filters: AdminFilterEntry[]) {
    setAdminFilters(filters);
    await loadPage(1, filters);
  }

  function openCreateModal() {
    setEditingEntry(null);
    setFormOpen(true);
  }

  function openEditModal(entry: VehicleCatalogEntry) {
    setEditingEntry(entry);
    setFormOpen(true);
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">ტექნიკის კატალოგი</h1>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setBulkImportOpen(true)}
            disabled={!canCreate}
            className="rounded-full border border-border px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-muted disabled:opacity-50"
          >
            Excel-ით ატვირთვა
          </button>
          <button
            type="button"
            onClick={openCreateModal}
            disabled={!canCreate}
            className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover disabled:opacity-50"
          >
            + ტექნიკის დამატება
          </button>
        </div>
      </div>

      {!canCreate && (
        <p className="mt-2 text-sm text-muted-foreground">
          დამატებამდე საჭიროა მინიმუმ ერთი კატეგორია, მარკა და მოდელი არსებობდეს.
        </p>
      )}

      <div className="mt-4">
        <AdminFilterPanel fields={filterFields} onChange={handleFilterApply} />
      </div>

      <div className="mt-6">
        <DataTable
          columns={columns}
          data={data.items}
          getRowKey={(entry) => entry.id}
          emptyMessage="ტექნიკა არ არსებობს"
          actions={(entry) => (
            <RowActions
              onEdit={() => openEditModal(entry)}
              onDelete={() => setDeletingEntry(entry)}
            />
          )}
        />
        <Pagination currentPage={data.page} totalPages={totalPages} onPageChange={loadPage} />
      </div>

      <VehicleCatalogFormModal
        key={`${editingEntry?.id ?? "new"}-${formOpen}`}
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={refresh}
        categories={categories}
        brands={brands}
        models={models}
        fuelTypes={fuelTypes}
        transmissionTypes={transmissionTypes}
        coolingTypes={coolingTypes}
        finalDriveTypes={finalDriveTypes}
        driveTypes={driveTypes}
        startTypes={startTypes}
        powertrainTypes={powertrainTypes}
        entry={editingEntry}
      />

      <VehicleCatalogBulkImportModal
        open={bulkImportOpen}
        onClose={() => setBulkImportOpen(false)}
        onImported={() => refresh()}
      />

      <ConfirmDialog
        open={deletingEntry !== null}
        onClose={() => setDeletingEntry(null)}
        title="ტექნიკის წაშლა"
        message={
          <>
            დარწმუნებული ხართ, რომ გსურთ წაშალოთ{" "}
            <span className="font-semibold text-foreground">
              {deletingEntry?.brand.name} {deletingEntry?.model.name}
            </span>
            ? ამ მოქმედების გაუქმება შეუძლებელია.
          </>
        }
        successMessage="ჩანაწერი წაიშალა"
        onConfirm={async () => {
          if (!deletingEntry) return;
          await deleteVehicleCatalogEntry(deletingEntry.id);
          await refresh();
        }}
      />
    </div>
  );
}
