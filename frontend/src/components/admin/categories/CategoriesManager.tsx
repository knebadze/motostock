"use client";

import { useState } from "react";
import { toast } from "sonner";
import { deleteCategory, listCategories, type Category } from "@/lib/api/categories";
import { ApiRequestError, resolveMediaUrl } from "@/lib/api/client";
import type { AdminFilterEntry } from "@/lib/api/admin-filters";
import { flattenTree, type CategoryNode } from "@/lib/categories-tree";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { RowActions } from "@/components/shared/RowActions";
import { DataTable, type DataTableColumn } from "@/components/shared/DataTable";
import { AdminFilterPanel } from "@/components/admin/shared/AdminFilterPanel";
import { buildCategoryFilterFields } from "@/config/admin-filters/category-filters";
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
  // Full, unfiltered tree — needed for the parent-category picker in the
  // create/edit form and for the PARENT filter's own option list, both of
  // which must stay complete regardless of what's currently filtered.
  const [allCategories, setAllCategories] = useState(initialCategories);
  // What the table actually shows — the full tree when no filter is active,
  // or the server-filtered (flat) result set otherwise.
  const [displayedCategories, setDisplayedCategories] = useState(initialCategories);
  const [adminFilters, setAdminFilters] = useState<AdminFilterEntry[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null);

  const filterFields = buildCategoryFilterFields({ categories: allCategories });

  async function refresh() {
    try {
      const fresh = await listCategories();
      setAllCategories(fresh);
      setDisplayedCategories(adminFilters.length > 0 ? await listCategories(adminFilters) : fresh);
    } catch (error) {
      const message =
        error instanceof ApiRequestError ? error.message : "სიის განახლება ვერ მოხერხდა";
      toast.error(message);
    }
  }

  // AdminFilterPanel only calls this once, on "გაფილტვრა" — one click, one
  // request, never on every keystroke.
  async function handleFilterApply(filters: AdminFilterEntry[]) {
    setAdminFilters(filters);
    try {
      setDisplayedCategories(await listCategories(filters));
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

  // A filtered result set isn't a coherent tree (a matched category's parent
  // may not itself match) — show it flat instead of indenting by depth.
  const rows: CategoryNode[] =
    adminFilters.length > 0
      ? displayedCategories.map((category) => ({ ...category, depth: 0 }))
      : flattenTree(displayedCategories);

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

      <div className="mt-4">
        <AdminFilterPanel fields={filterFields} onChange={handleFilterApply} />
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
        categories={allCategories}
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
