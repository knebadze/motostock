"use client";

import { useState } from "react";
import { toast } from "sonner";
import { deleteCategory, listCategories, type Category } from "@/lib/api/categories";
import { ApiRequestError, resolveMediaUrl } from "@/lib/api/client";
import { flattenTree, type CategoryNode } from "@/lib/categories-tree";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { RowActions } from "@/components/shared/RowActions";
import { DataTable, type DataTableColumn } from "@/components/shared/DataTable";
import { CategoryFormModal } from "./CategoryFormModal";

const columns: DataTableColumn<CategoryNode>[] = [
  {
    header: "",
    render: (category) =>
      resolveMediaUrl(category.imageUrl) ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={resolveMediaUrl(category.imageUrl) ?? undefined}
          alt=""
          className="size-10 rounded-lg border border-border object-cover"
        />
      ) : (
        <div className="size-10 rounded-lg border border-dashed border-border" />
      ),
  },
  {
    header: "სახელი",
    render: (category) => (
      <span style={{ paddingLeft: `${category.depth * 1.5}rem` }}>
        {category.depth > 0 && <span className="mr-1 text-muted-foreground">└</span>}
        {category.name.ka}
      </span>
    ),
  },
  { header: "სახელი (EN)", render: (category) => category.name.en, cellClassName: "text-muted-foreground" },
  { header: "სახელი (RU)", render: (category) => category.name.ru, cellClassName: "text-muted-foreground" },
  { header: "Slug", render: (category) => category.slug, cellClassName: "font-mono text-muted-foreground" },
  {
    header: "თანმიმდევრობა",
    render: (category) => category.sortOrder,
    cellClassName: "text-muted-foreground",
  },
  {
    header: "მშობელი",
    render: (category) => category.parent?.name.ka ?? "—",
    cellClassName: "text-muted-foreground",
  },
];

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

      <div className="mt-6">
        <DataTable
          columns={columns}
          data={rows}
          getRowKey={(category) => category.id}
          emptyMessage="კატეგორია არ არსებობს"
          actions={(category) => (
            <RowActions
              onEdit={() => openEditModal(category)}
              onDelete={() => setDeletingCategory(category)}
            />
          )}
        />
      </div>

      <CategoryFormModal
        key={`${editingCategory?.id ?? "new"}-${formOpen}`}
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={refresh}
        categories={categories}
        category={editingCategory}
      />

      <ConfirmDialog
        open={deletingCategory !== null}
        onClose={() => setDeletingCategory(null)}
        title="კატეგორიის წაშლა"
        message={
          <>
            დარწმუნებული ხართ, რომ გსურთ წაშალოთ კატეგორია{" "}
            <span className="font-semibold text-foreground">{deletingCategory?.name.ka}</span>?
            ამ მოქმედების გაუქმება შეუძლებელია.
          </>
        }
        successMessage="კატეგორია წაიშალა"
        onConfirm={async () => {
          if (!deletingCategory) return;
          await deleteCategory(deletingCategory.id);
          await refresh();
        }}
      />
    </div>
  );
}
