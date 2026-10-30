"use client";

import { useState } from "react";
import { toast } from "sonner";
import { deleteBrand, listBrandsPage, type Brand, type BrandPage } from "@/lib/api/brands";
import { ApiRequestError, resolveMediaUrl } from "@/lib/api/client";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { RowActions } from "@/components/shared/RowActions";
import { DataTable, type DataTableColumn } from "@/components/shared/DataTable";
import { Pagination, useServerPagination } from "@/components/shared/Pagination";
import { AdminFilterPanel } from "@/components/admin/shared/AdminFilterPanel";
import type { AdminFilterEntry } from "@/lib/api/admin-filters";
import { buildBrandFilterFields } from "@/config/admin-filters/brand-filters";
import { BrandFormModal } from "./BrandFormModal";
import { revalidatePublicCache } from "@/lib/api/revalidate";

const columns: DataTableColumn<Brand>[] = [
  {
    header: "",
    render: (brand) =>
      resolveMediaUrl(brand.logoUrl) ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={resolveMediaUrl(brand.logoUrl) ?? undefined}
          alt=""
          className="size-10 rounded-lg border border-border object-cover"
        />
      ) : (
        <div className="size-10 rounded-lg border border-dashed border-border" />
      ),
  },
  { header: "სახელი", render: (brand) => brand.name },
  { header: "Slug", render: (brand) => brand.slug, cellClassName: "font-mono text-muted-foreground" },
];

export function BrandsManager({ initialData }: { initialData: BrandPage }) {
  const { data, totalPages, load } = useServerPagination(initialData);
  const [formOpen, setFormOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);
  const [deletingBrand, setDeletingBrand] = useState<Brand | null>(null);
  const [adminFilters, setAdminFilters] = useState<AdminFilterEntry[]>([]);

  const filterFields = buildBrandFilterFields();

  async function loadPage(page: number, filters: AdminFilterEntry[] = adminFilters) {
    await load(
      () => listBrandsPage(filters, page, data.pageSize),
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
    setEditingBrand(null);
    setFormOpen(true);
  }

  function openEditModal(brand: Brand) {
    setEditingBrand(brand);
    setFormOpen(true);
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">მარკები</h1>
        <button
          type="button"
          onClick={openCreateModal}
          className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover"
        >
          + მარკის დამატება
        </button>
      </div>

      <div className="mt-4">
        <AdminFilterPanel fields={filterFields} onChange={handleFilterApply} />
      </div>

      <div className="mt-6">
        <DataTable
          columns={columns}
          data={data.items}
          totalCount={data.total}
          getRowKey={(brand) => brand.id}
          emptyMessage="მარკა არ არსებობს"
          actions={(brand) => (
            <RowActions
              onEdit={() => openEditModal(brand)}
              onDelete={() => setDeletingBrand(brand)}
            />
          )}
        />
        <Pagination currentPage={data.page} totalPages={totalPages} onPageChange={loadPage} />
      </div>

      <BrandFormModal
        key={`${editingBrand?.id ?? "new"}-${formOpen}`}
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={refresh}
        brand={editingBrand}
      />

      <ConfirmDialog
        open={deletingBrand !== null}
        onClose={() => setDeletingBrand(null)}
        title="მარკის წაშლა"
        message={
          <>
            დარწმუნებული ხართ, რომ გსურთ წაშალოთ მარკა{" "}
            <span className="font-semibold text-foreground">{deletingBrand?.name}</span>?
            ამ მოქმედების გაუქმება შეუძლებელია.
          </>
        }
        successMessage="მარკა წაიშალა"
        onConfirm={async () => {
          if (!deletingBrand) return;
          await deleteBrand(deletingBrand.id);
          await revalidatePublicCache("vehicle-catalog");
          await refresh();
        }}
      />
    </div>
  );
}
