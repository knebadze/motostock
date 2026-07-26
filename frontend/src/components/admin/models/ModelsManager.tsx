"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Select } from "@/components/shared/Select";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { deleteModel, listModels, type Model } from "@/lib/api/models";
import type { Brand } from "@/lib/api/brands";
import { ApiRequestError } from "@/lib/api/client";
import { ModelFormModal } from "./ModelFormModal";

export function ModelsManager({
  initialModels,
  brands,
}: {
  initialModels: Model[];
  brands: Brand[];
}) {
  const [models, setModels] = useState(initialModels);
  const [brandFilter, setBrandFilter] = useState<string>("");
  const [formOpen, setFormOpen] = useState(false);
  const [editingModel, setEditingModel] = useState<Model | null>(null);
  const [deletingModel, setDeletingModel] = useState<Model | null>(null);

  const brandFilterOptions = [
    { value: "", label: "ყველა მარკა" },
    ...brands.map((brand) => ({ value: String(brand.id), label: brand.name.ka })),
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
          disabled={brands.length === 0}
          className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover disabled:opacity-50"
        >
          + მოდელის დამატება
        </button>
      </div>

      {brands.length === 0 && (
        <p className="mt-2 text-sm text-muted-foreground">
          მოდელის დასამატებლად ჯერ საჭიროა მინიმუმ ერთი მარკის შექმნა.
        </p>
      )}

      <div className="mt-4 w-64">
        <Select
          options={brandFilterOptions}
          value={brandFilter}
          onChange={handleFilterChange}
          searchable
          placeholder="ყველა მარკა"
        />
      </div>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-border">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">მარკა</th>
              <th className="px-4 py-3 font-medium">სახელი</th>
              <th className="px-4 py-3 font-medium">სახელი (EN)</th>
              <th className="px-4 py-3 font-medium">სახელი (RU)</th>
              <th className="px-4 py-3 font-medium">Slug</th>
              <th className="px-4 py-3 font-medium text-right">მოქმედება</th>
            </tr>
          </thead>
          <tbody>
            {models.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                  მოდელი არ არსებობს
                </td>
              </tr>
            )}
            {models.map((model) => (
              <tr key={model.id} className="border-b border-border last:border-0">
                <td className="px-4 py-3">{model.brand.name.ka}</td>
                <td className="px-4 py-3">{model.name.ka}</td>
                <td className="px-4 py-3 text-muted-foreground">{model.name.en}</td>
                <td className="px-4 py-3 text-muted-foreground">{model.name.ru}</td>
                <td className="px-4 py-3 font-mono text-muted-foreground">{model.slug}</td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1">
                    <button
                      type="button"
                      onClick={() => openEditModal(model)}
                      aria-label="რედაქტირება"
                      title="რედაქტირება"
                      className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-primary"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="size-4"
                      >
                        <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeletingModel(model)}
                      aria-label="წაშლა"
                      title="წაშლა"
                      className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-red-600"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="size-4"
                      >
                        <path d="M3 6h18" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                        <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        <line x1="10" y1="11" x2="10" y2="17" />
                        <line x1="14" y1="11" x2="14" y2="17" />
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ModelFormModal
        key={`${editingModel?.id ?? "new"}-${formOpen}`}
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={refresh}
        brands={brands}
        model={editingModel}
      />

      <ConfirmDialog
        open={deletingModel !== null}
        onClose={() => setDeletingModel(null)}
        title="მოდელის წაშლა"
        message={
          <>
            დარწმუნებული ხართ, რომ გსურთ წაშალოთ მოდელი{" "}
            <span className="font-semibold text-foreground">{deletingModel?.name.ka}</span>?
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
