"use client";

import { useState } from "react";
import { toast } from "sonner";
import { listCategories, type Category } from "@/lib/api/categories";
import { ApiRequestError, resolveMediaUrl } from "@/lib/api/client";
import { flattenTree } from "@/lib/categories-tree";
import { CategoryFormModal } from "./CategoryFormModal";
import { DeleteCategoryDialog } from "./DeleteCategoryDialog";

export function CategoriesManager({
  initialCategories,
}: {
  initialCategories: Category[];
}) {
  const [categories, setCategories] = useState(initialCategories);
  const [formOpen, setFormOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null);

  async function refresh() {
    try {
      setCategories(await listCategories());
    } catch (error) {
      const message =
        error instanceof ApiRequestError ? error.message : "სიის განახლება ვერ მოხერხდა";
      toast.error(message);
    }
  }

  function openCreateModal() {
    setEditingCategory(null);
    setFormOpen(true);
  }

  function openEditModal(category: Category) {
    setEditingCategory(category);
    setFormOpen(true);
  }

  const rows = flattenTree(categories);

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">კატეგორიები</h1>
        <button
          type="button"
          onClick={openCreateModal}
          className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover"
        >
          + კატეგორიის დამატება
        </button>
      </div>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-border">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium"></th>
              <th className="px-4 py-3 font-medium">სახელი</th>
              <th className="px-4 py-3 font-medium">სახელი (EN)</th>
              <th className="px-4 py-3 font-medium">სახელი (RU)</th>
              <th className="px-4 py-3 font-medium">Slug</th>
              <th className="px-4 py-3 font-medium">მშობელი</th>
              <th className="px-4 py-3 font-medium text-right">მოქმედება</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                  კატეგორია არ არსებობს
                </td>
              </tr>
            )}
            {rows.map((category) => (
              <tr key={category.id} className="border-b border-border last:border-0">
                <td className="px-4 py-3">
                  {resolveMediaUrl(category.imageUrl) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={resolveMediaUrl(category.imageUrl) ?? undefined}
                      alt=""
                      className="size-10 rounded-lg border border-border object-cover"
                    />
                  ) : (
                    <div className="size-10 rounded-lg border border-dashed border-border" />
                  )}
                </td>
                <td className="px-4 py-3">
                  <span style={{ paddingLeft: `${category.depth * 1.5}rem` }}>
                    {category.depth > 0 && (
                      <span className="mr-1 text-muted-foreground">└</span>
                    )}
                    {category.name.ka}
                  </span>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{category.name.en}</td>
                <td className="px-4 py-3 text-muted-foreground">{category.name.ru}</td>
                <td className="px-4 py-3 font-mono text-muted-foreground">
                  {category.slug}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {category.parent?.name.ka ?? "—"}
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1">
                    <button
                      type="button"
                      onClick={() => openEditModal(category)}
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
                      onClick={() => setDeletingCategory(category)}
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

      <CategoryFormModal
        key={`${editingCategory?.id ?? "new"}-${formOpen}`}
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={refresh}
        categories={categories}
        category={editingCategory}
      />

      <DeleteCategoryDialog
        open={deletingCategory !== null}
        onClose={() => setDeletingCategory(null)}
        onDeleted={refresh}
        category={deletingCategory}
      />
    </div>
  );
}
