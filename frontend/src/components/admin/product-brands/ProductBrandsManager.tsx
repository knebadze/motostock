"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Select } from "@/components/shared/Select";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { RowActions } from "@/components/shared/RowActions";
import { DataTable, type DataTableColumn } from "@/components/shared/DataTable";
import { deleteProductBrand, listProductBrands, type ProductBrand } from "@/lib/api/product-brands";
import type { Category } from "@/lib/api/categories";
import { ApiRequestError } from "@/lib/api/client";
import { flattenTree } from "@/lib/categories-tree";
import { ProductBrandFormModal } from "./ProductBrandFormModal";

const columns: DataTableColumn<ProductBrand>[] = [
  { header: "სახელი", render: (productBrand) => productBrand.name.ka },
  {
    header: "კატეგორია",
    render: (productBrand) => productBrand.category.name.ka,
    cellClassName: "text-muted-foreground",
  },
  {
    header: "Slug",
    render: (productBrand) => productBrand.slug,
    cellClassName: "font-mono text-muted-foreground",
  },
];

export function ProductBrandsManager({
  initialProductBrands,
  categories,
}: {
  initialProductBrands: ProductBrand[];
  categories: Category[];
}) {
  const [productBrands, setProductBrands] = useState(initialProductBrands);
  const [categoryFilter, setCategoryFilter] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editingProductBrand, setEditingProductBrand] = useState<ProductBrand | null>(null);
  const [deletingProductBrand, setDeletingProductBrand] = useState<ProductBrand | null>(null);

  const categoryFilterOptions = [
    { value: "", label: "ყველა კატეგორია" },
    ...flattenTree(categories).map((category) => ({
      value: String(category.id),
      label: `${"— ".repeat(category.depth)}${category.name.ka}`,
    })),
  ];

  async function refresh(nextFilter?: string) {
    const filter = nextFilter ?? categoryFilter;
    try {
      setProductBrands(await listProductBrands(filter ? Number(filter) : undefined));
    } catch (error) {
      const message =
        error instanceof ApiRequestError ? error.message : "სიის განახლება ვერ მოხერხდა";
      toast.error(message);
    }
  }

  async function handleFilterChange(value: string) {
    setCategoryFilter(value);
    await refresh(value);
  }

  function openCreateModal() {
    setEditingProductBrand(null);
    setFormOpen(true);
  }

  function openEditModal(productBrand: ProductBrand) {
    setEditingProductBrand(productBrand);
    setFormOpen(true);
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">პროდუქტის ბრენდები</h1>
        <button
          type="button"
          onClick={openCreateModal}
          disabled={categories.length === 0}
          className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover disabled:opacity-50"
        >
          + ბრენდის დამატება
        </button>
      </div>

      {categories.length === 0 && (
        <p className="mt-2 text-sm text-muted-foreground">
          ბრენდის დასამატებლად ჯერ საჭიროა მინიმუმ ერთი კატეგორიის შექმნა.
        </p>
      )}

      <div className="mt-4 w-72">
        <Select
          options={categoryFilterOptions}
          value={categoryFilter}
          onChange={handleFilterChange}
          searchable
          placeholder="ყველა კატეგორია"
        />
      </div>

      <div className="mt-6">
        <DataTable
          columns={columns}
          data={productBrands}
          getRowKey={(productBrand) => productBrand.id}
          emptyMessage="ბრენდი არ არსებობს"
          actions={(productBrand) => (
            <RowActions
              onEdit={() => openEditModal(productBrand)}
              onDelete={() => setDeletingProductBrand(productBrand)}
            />
          )}
        />
      </div>

      <ProductBrandFormModal
        key={`${editingProductBrand?.id ?? "new"}-${formOpen}`}
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={() => refresh()}
        categories={categories}
        productBrand={editingProductBrand}
      />

      <ConfirmDialog
        open={deletingProductBrand !== null}
        onClose={() => setDeletingProductBrand(null)}
        title="ბრენდის წაშლა"
        message={
          <>
            დარწმუნებული ხართ, რომ გსურთ წაშალოთ{" "}
            <span className="font-semibold text-foreground">{deletingProductBrand?.name.ka}</span>?
            ამ მოქმედების გაუქმება შეუძლებელია.
          </>
        }
        successMessage="ბრენდი წაიშალა"
        onConfirm={async () => {
          if (!deletingProductBrand) return;
          await deleteProductBrand(deletingProductBrand.id);
          await refresh();
        }}
      />
    </div>
  );
}
