"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { RowActions } from "@/components/shared/RowActions";
import { DataTable, type DataTableColumn } from "@/components/shared/DataTable";
import { Pagination, useServerPagination } from "@/components/shared/Pagination";
import { AdminFilterPanel } from "@/components/admin/shared/AdminFilterPanel";
import { deleteModel, listModelsPage, type Model, type ModelPage } from "@/lib/api/models";
import type { AdminFilterEntry } from "@/lib/api/admin-filters";
import type { Brand } from "@/lib/api/brands";
import type { Category } from "@/lib/api/categories";
import { ApiRequestError } from "@/lib/api/client";
import { buildModelFilterFields } from "@/config/admin-filters/model-filters";
import { ModelFormModal } from "./ModelFormModal";
import { revalidatePublicCache } from "@/lib/api/revalidate";

const columns: DataTableColumn<Model>[] = [
  { header: "მარკა", render: (model) => model.brand.name },
  { header: "სახელი", render: (model) => model.name },
  {
    header: "ტიპი",
    render: (model) => model.category.name.ka,
    cellClassName: "text-muted-foreground",
  },
  { header: "Slug", render: (model) => model.slug, cellClassName: "font-mono text-muted-foreground" },
];

export function ModelsManager({
  initialData,
  brands,
  categories,
}: {
  initialData: ModelPage;
  brands: Brand[];
  categories: Category[];
}) {
  const { data, totalPages, load } = useServerPagination(initialData);
  const [formOpen, setFormOpen] = useState(false);
  const [editingModel, setEditingModel] = useState<Model | null>(null);
  const [deletingModel, setDeletingModel] = useState<Model | null>(null);
  const [adminFilters, setAdminFilters] = useState<AdminFilterEntry[]>([]);

  const filterFields = buildModelFilterFields({ brands, categories });

  async function loadPage(page: number, filters: AdminFilterEntry[] = adminFilters) {
    await load(
      () => listModelsPage(filters, page, data.pageSize),
      (error) => {
        const message =
          error instanceof ApiRequestError ? error.message : "სიის განახლება ვერ მოხერხდა";
        toast.error(message);
      },
    );
  }

  // refresh() re-fetches the current page under the current filters — used
  // after create/edit/delete, where the page shouldn't change.
  async function refresh() {
    await loadPage(data.page);
  }

  // AdminFilterPanel only calls this once, on "გაფილტვრა" — a new filter
  // always resets to page 1.
  async function handleFilterApply(filters: AdminFilterEntry[]) {
    setAdminFilters(filters);
    await loadPage(1, filters);
  }

  function openCreateModal() {
    setEditingModel(null);
    setFormOpen(true);
  }

  function openEditModal(model: Model) {
    setEditingModel(model);
    setFormOpen(true);
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">მოდელები</h1>
        <button
          type="button"
          onClick={openCreateModal}
          disabled={brands.length === 0 || categories.length === 0}
          className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover disabled:opacity-50"
        >
          + მოდელის დამატება
        </button>
      </div>

      {(brands.length === 0 || categories.length === 0) && (
        <p className="mt-2 text-sm text-muted-foreground">
          მოდელის დასამატებლად ჯერ საჭიროა მინიმუმ ერთი მარკისა და ტიპის (კატეგორიის) შექმნა.
        </p>
      )}

      <div className="mt-4">
        <AdminFilterPanel fields={filterFields} onChange={handleFilterApply} />
      </div>

      <div className="mt-6">
        <DataTable
          columns={columns}
          data={data.items}
          totalCount={data.total}
          getRowKey={(model) => model.id}
          emptyMessage="მოდელი არ არსებობს"
          actions={(model) => (
            <RowActions
              onEdit={() => openEditModal(model)}
              onDelete={() => setDeletingModel(model)}
            />
          )}
        />
        <Pagination currentPage={data.page} totalPages={totalPages} onPageChange={loadPage} />
      </div>

      <ModelFormModal
        key={`${editingModel?.id ?? "new"}-${formOpen}`}
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={refresh}
        brands={brands}
        categories={categories}
        model={editingModel}
      />

      <ConfirmDialog
        open={deletingModel !== null}
        onClose={() => setDeletingModel(null)}
        title="მოდელის წაშლა"
        message={
          <>
            დარწმუნებული ხართ, რომ გსურთ წაშალოთ მოდელი{" "}
            <span className="font-semibold text-foreground">{deletingModel?.name}</span>?
            ამ მოქმედების გაუქმება შეუძლებელია.
          </>
        }
        successMessage="მოდელი წაიშალა"
        onConfirm={async () => {
          if (!deletingModel) return;
          await deleteModel(deletingModel.id);
          await revalidatePublicCache("vehicle-catalog");
          await refresh();
        }}
      />
    </div>
  );
}
