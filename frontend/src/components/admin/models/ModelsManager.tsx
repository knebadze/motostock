"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Select } from "@/components/shared/Select";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { RowActions } from "@/components/shared/RowActions";
import { DataTable, type DataTableColumn } from "@/components/shared/DataTable";
import { deleteModel, listModels, type Model } from "@/lib/api/models";
import type { Brand } from "@/lib/api/brands";
import type { Category } from "@/lib/api/categories";
import { ApiRequestError } from "@/lib/api/client";
import { ModelFormModal } from "./ModelFormModal";

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
  initialModels,
  brands,
  categories,
}: {
  initialModels: Model[];
  brands: Brand[];
  categories: Category[];
}) {
  const [models, setModels] = useState(initialModels);
  const [brandFilter, setBrandFilter] = useState<string>("");
  const [formOpen, setFormOpen] = useState(false);
  const [editingModel, setEditingModel] = useState<Model | null>(null);
  const [deletingModel, setDeletingModel] = useState<Model | null>(null);

  const brandFilterOptions = [
    { value: "", label: "ყველა მარკა" },
    ...brands.map((brand) => ({ value: String(brand.id), label: brand.name })),
  ];

  async function refresh() {
    try {
      setModels(await listModels(brandFilter ? Number(brandFilter) : undefined));
    } catch (error) {
      const message =
        error instanceof ApiRequestError ? error.message : "სიის განახლება ვერ მოხერხდა";
      toast.error(message);
    }
  }

  async function handleFilterChange(value: string) {
    setBrandFilter(value);
    try {
      setModels(await listModels(value ? Number(value) : undefined));
    } catch (error) {
      const message =
        error instanceof ApiRequestError ? error.message : "სიის განახლება ვერ მოხერხდა";
      toast.error(message);
    }
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

      <div className="mt-4 w-64">
        <Select
          options={brandFilterOptions}
          value={brandFilter}
          onChange={handleFilterChange}
          searchable
          placeholder="ყველა მარკა"
          ariaLabel="მარკის ფილტრი"
        />
      </div>

      <div className="mt-6">
        <DataTable
          columns={columns}
          data={models}
          getRowKey={(model) => model.id}
          emptyMessage="მოდელი არ არსებობს"
          actions={(model) => (
            <RowActions
              onEdit={() => openEditModal(model)}
              onDelete={() => setDeletingModel(model)}
            />
          )}
        />
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
          await refresh();
        }}
      />
    </div>
  );
}
