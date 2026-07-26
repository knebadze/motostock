"use client";

import { useState } from "react";
import { toast } from "sonner";
import { deleteBrand, listBrands, type Brand } from "@/lib/api/brands";
import { ApiRequestError, resolveMediaUrl } from "@/lib/api/client";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { BrandFormModal } from "./BrandFormModal";

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

      <div className="mt-6 overflow-x-auto rounded-2xl border border-border">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium"></th>
              <th className="px-4 py-3 font-medium">სახელი</th>
              <th className="px-4 py-3 font-medium">სახელი (EN)</th>
              <th className="px-4 py-3 font-medium">სახელი (RU)</th>
              <th className="px-4 py-3 font-medium">Slug</th>
              <th className="px-4 py-3 font-medium text-right">მოქმედება</th>
            </tr>
          </thead>
          <tbody>
            {brands.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                  მარკა არ არსებობს
                </td>
              </tr>
            )}
            {brands.map((brand) => (
              <tr key={brand.id} className="border-b border-border last:border-0">
                <td className="px-4 py-3">
                  {resolveMediaUrl(brand.logoUrl) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={resolveMediaUrl(brand.logoUrl) ?? undefined}
                      alt=""
                      className="size-10 rounded-lg border border-border object-cover"
                    />
                  ) : (
                    <div className="size-10 rounded-lg border border-dashed border-border" />
                  )}
                </td>
                <td className="px-4 py-3">{brand.name.ka}</td>
                <td className="px-4 py-3 text-muted-foreground">{brand.name.en}</td>
                <td className="px-4 py-3 text-muted-foreground">{brand.name.ru}</td>
                <td className="px-4 py-3 font-mono text-muted-foreground">{brand.slug}</td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1">
                    <button
                      type="button"
                      onClick={() => openEditModal(brand)}
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
                      onClick={() => setDeletingBrand(brand)}
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
