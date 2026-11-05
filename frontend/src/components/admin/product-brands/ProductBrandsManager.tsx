"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { RowActions } from "@/components/shared/RowActions";
import { DataTable, type DataTableColumn } from "@/components/shared/DataTable";
import { Pagination, useServerPagination } from "@/components/shared/Pagination";
import { AdminFilterPanel } from "@/components/admin/shared/AdminFilterPanel";
import {
  deleteProductBrand,
  listProductBrandsPage,
  type ProductBrand,
  type ProductBrandPage,
} from "@/lib/api/product-brands";
import type { AdminFilterEntry } from "@/lib/api/admin-filters";
import type { Category } from "@/lib/api/categories";
import { ApiRequestError, resolveMediaUrl } from "@/lib/api/client";
import { buildProductBrandFilterFields } from "@/config/admin-filters/product-brand-filters";
import { ProductBrandFormModal } from "./ProductBrandFormModal";

const columns: DataTableColumn<ProductBrand>[] = [
  {
    header: "",
    render: (productBrand) =>
      resolveMediaUrl(productBrand.logoUrl) ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={resolveMediaUrl(productBrand.logoUrl) ?? undefined}
          alt=""
          className="size-10 rounded-lg border border-border object-cover"
        />
      ) : (
        <div className="size-10 rounded-lg border border-dashed border-border" />
      ),
  },
  { header: "სახელი", render: (productBrand) => productBrand.name },
  {
    header: "კატეგორიები",
    render: (productBrand) => productBrand.categories.map((category) => category.name.ka).join(", "),
    cellClassName: "text-muted-foreground",
  },
  {
    header: "Slug",
    render: (productBrand) => productBrand.slug,
    cellClassName: "font-mono text-muted-foreground",
  },
];

export function ProductBrandsManager({
  initialData,
  categories,
}: {
  initialData: ProductBrandPage;
  categories: Category[];
}) {
  const { data, totalPages, load } = useServerPagination(initialData);
  const [formOpen, setFormOpen] = useState(false);
  const [editingProductBrand, setEditingProductBrand] = useState<ProductBrand | null>(null);
  const [deletingProductBrand, setDeletingProductBrand] = useState<ProductBrand | null>(null);
  const [adminFilters, setAdminFilters] = useState<AdminFilterEntry[]>([]);

  const filterFields = buildProductBrandFilterFields({ categories });

  async function loadPage(page: number, filters: AdminFilterEntry[] = adminFilters) {
    await load(
      () => listProductBrandsPage(filters, page, data.pageSize),
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

      <div className="mt-4">
        <AdminFilterPanel fields={filterFields} onChange={handleFilterApply} />
      </div>

      <div className="mt-6">
        <DataTable
          columns={columns}
          data={data.items}
          totalCount={data.total}
          getRowKey={(productBrand) => productBrand.id}
          emptyMessage="ბრენდი არ არსებობს"
          actions={(productBrand) => (
            <RowActions
              onEdit={() => openEditModal(productBrand)}
              onDelete={() => setDeletingProductBrand(productBrand)}
            />
          )}
        />
        <Pagination currentPage={data.page} totalPages={totalPages} onPageChange={loadPage} />
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
            <span className="font-semibold text-foreground">{deletingProductBrand?.name}</span>?
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
