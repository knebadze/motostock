"use client";

import { useState } from "react";
import { toast } from "sonner";
import { deleteBrand, listBrands, type Brand } from "@/lib/api/brands";
import { ApiRequestError, resolveMediaUrl } from "@/lib/api/client";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { RowActions } from "@/components/shared/RowActions";
import { DataTable, type DataTableColumn } from "@/components/shared/DataTable";
import { BrandFormModal } from "./BrandFormModal";

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
  { header: "სახელი", render: (brand) => brand.name.ka },
  { header: "სახელი (EN)", render: (brand) => brand.name.en, cellClassName: "text-muted-foreground" },
  { header: "სახელი (RU)", render: (brand) => brand.name.ru, cellClassName: "text-muted-foreground" },
  { header: "Slug", render: (brand) => brand.slug, cellClassName: "font-mono text-muted-foreground" },
];

export function BrandsManager({ initialBrands }: { initialBrands: Brand[] }) {
  const [brands, setBrands] = useState(initialBrands);
  const [formOpen, setFormOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);
  const [deletingBrand, setDeletingBrand] = useState<Brand | null>(null);

  async function refresh() {
    try {
      setBrands(await listBrands());
    } catch (error) {
      const message =
        error instanceof ApiRequestError ? error.message : "სიის განახლება ვერ მოხერხდა";
      toast.error(message);
    }
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

      <div className="mt-6">
        <DataTable
          columns={columns}
          data={brands}
          getRowKey={(brand) => brand.id}
          emptyMessage="მარკა არ არსებობს"
          actions={(brand) => (
            <RowActions
              onEdit={() => openEditModal(brand)}
              onDelete={() => setDeletingBrand(brand)}
            />
          )}
        />
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
            <span className="font-semibold text-foreground">{deletingBrand?.name.ka}</span>?
            ამ მოქმედების გაუქმება შეუძლებელია.
          </>
        }
        successMessage="მარკა წაიშალა"
        onConfirm={async () => {
          if (!deletingBrand) return;
          await deleteBrand(deletingBrand.id);
          await refresh();
        }}
      />
    </div>
  );
}
