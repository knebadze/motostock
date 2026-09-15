"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { RowActions } from "@/components/shared/RowActions";
import { DataTable, type DataTableColumn } from "@/components/shared/DataTable";
import { Pagination } from "@/components/shared/Pagination";
import { AdminFilterPanel } from "@/components/admin/shared/AdminFilterPanel";
import { deleteProduct, listProductsPage, type Product } from "@/lib/api/products";
import { syncProductStock } from "@/lib/api/fina-sync";
import type { AdminListPage } from "@/lib/api/server";
import { resolveMediaUrl, ApiRequestError } from "@/lib/api/client";
import type { AdminFilterEntry } from "@/lib/api/admin-filters";
import type { Category } from "@/lib/api/categories";
import type { ProductBrand } from "@/lib/api/product-brands";
import type { LookupItem } from "@/lib/api/lookups";
import { buildProductFilterFields } from "@/config/admin-filters/product-filters";
import { formatPrice } from "@/lib/format";
import { ProductDetailModal } from "./ProductDetailModal";

const columns: DataTableColumn<Product>[] = [
  {
    header: "",
    render: (product) =>
      resolveMediaUrl(product.imageUrl) ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={resolveMediaUrl(product.imageUrl) ?? undefined}
          alt=""
          className="size-10 rounded-lg border border-border object-cover"
        />
      ) : (
        <div className="size-10 rounded-lg border border-dashed border-border" />
      ),
  },
  { header: "სახელი", render: (product) => product.name.ka },
  {
    header: "კატეგორია",
    render: (product) => product.category.name.ka,
    cellClassName: "text-muted-foreground",
  },
  {
    header: "ბრენდი",
    render: (product) => product.productBrand?.name ?? "—",
    cellClassName: "text-muted-foreground",
  },
  {
    header: "ფასი",
    render: (product) =>
      product.minPrice == null ? (
        "—"
      ) : (
        <>
          {product.variantCount > 1 ? "დან " : ""}
          {formatPrice(product.minPrice)}
        </>
      ),
  },
  {
    header: "მარაგში",
    render: (product) => (product.variantCount > 0 ? product.totalStock : "—"),
    cellClassName: "text-muted-foreground",
  },
  {
    header: "ვარიანტები",
    render: (product) => product.variantCount,
    cellClassName: "text-muted-foreground",
  },
  {
    header: "ნახვები",
    render: (product) => product.viewCount,
    cellClassName: "text-muted-foreground",
  },
];

export function ProductsManager({
  initialData,
  categories,
  productBrands,
  sizes,
  colors,
  conditions,
  statuses,
}: {
  initialData: AdminListPage<Product>;
  categories: Category[];
  productBrands: ProductBrand[];
  sizes: LookupItem[];
  colors: LookupItem[];
  conditions: LookupItem[];
  statuses: LookupItem[];
}) {
  const router = useRouter();
  const [data, setData] = useState(initialData);
  const [adminFilters, setAdminFilters] = useState<AdminFilterEntry[]>([]);
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);
  const [viewingProductId, setViewingProductId] = useState<number | null>(null);
  const [syncingProductId, setSyncingProductId] = useState<number | null>(null);
  const totalPages = Math.max(1, Math.ceil(data.total / data.pageSize));

  const canCreate = categories.length > 0;

  const filterFields = buildProductFilterFields({
    categories,
    productBrands,
    sizes,
    colors,
    conditions,
    statuses,
  });

  async function loadPage(page: number, filters: AdminFilterEntry[] = adminFilters) {
    try {
      setData(await listProductsPage({ adminFilters: filters, page, pageSize: data.pageSize }));
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
    await loadPage(1, filters);
  }

  // Per-product manual re-check (see fina-sync.ts's syncProductStock),
  // mirroring OrderDetailModal.tsx's handleSyncStock — same messaging shape,
  // minus the order-auto-confirm concept that doesn't apply to a bare
  // product. Always shown regardless of whether this product actually has
  // any FINA-linked variants (the same "0 checked" case OrderDetailModal
  // already handles gracefully), rather than fetching variant/finaId detail
  // into the list response just to conditionally hide one button.
  async function handleSyncProduct(product: Product) {
    setSyncingProductId(product.id);
    try {
      const result = await syncProductStock(product.id);
      if (result.checked === 0) {
        toast.info("ამ პროდუქტს FINA-სთან დაკავშირებული ვარიანტი არ აქვს");
      } else {
        toast.success(`შემოწმდა ${result.checked} ვარიანტი, განახლდა ${result.updated}`);
        await loadPage(data.page);
      }
    } catch (error) {
      const message =
        error instanceof ApiRequestError ? error.message : "მარაგის სინქრონიზაცია ვერ მოხერხდა";
      toast.error(message);
    } finally {
      setSyncingProductId(null);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">პროდუქტები</h1>
        <button
          type="button"
          onClick={() => router.push("/admin/products/new")}
          disabled={!canCreate}
          className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover disabled:opacity-50"
        >
          + პროდუქტის დამატება
        </button>
      </div>

      {!canCreate && (
        <p className="mt-2 text-sm text-muted-foreground">
          პროდუქტის დასამატებლად ჯერ საჭიროა მინიმუმ ერთი კატეგორიის შექმნა.
        </p>
      )}

      <div className="mt-4">
        <AdminFilterPanel fields={filterFields} onChange={handleFilterApply} />
      </div>

      <div className="mt-6">
        <DataTable
          columns={columns}
          data={data.items}
          getRowKey={(product) => product.id}
          emptyMessage="პროდუქტი არ არსებობს"
          actions={(product) => (
            <RowActions
              onView={() => setViewingProductId(product.id)}
              onEdit={() => router.push(`/admin/products/${product.id}`)}
              onDelete={() => setDeletingProduct(product)}
              extra={
                <button
                  type="button"
                  onClick={() => handleSyncProduct(product)}
                  disabled={syncingProductId === product.id}
                  aria-label="FINA სინქრონიზაცია"
                  title="FINA სინქრონიზაცია"
                  className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-primary disabled:opacity-50"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className={`size-4 ${syncingProductId === product.id ? "animate-spin" : ""}`}
                  >
                    <path d="M21 12a9 9 0 0 1-15.3 6.4L3 16" />
                    <path d="M3 12a9 9 0 0 1 15.3-6.4L21 8" />
                    <path d="M3 16v4h4" />
                    <path d="M21 8V4h-4" />
                  </svg>
                </button>
              }
            />
          )}
        />
        <Pagination currentPage={data.page} totalPages={totalPages} onPageChange={(page) => loadPage(page)} />
      </div>

      {viewingProductId != null && (
        <ProductDetailModal productId={viewingProductId} onClose={() => setViewingProductId(null)} />
      )}

      <ConfirmDialog
        open={deletingProduct !== null}
        onClose={() => setDeletingProduct(null)}
        title="პროდუქტის წაშლა"
        message={
          <>
            დარწმუნებული ხართ, რომ გსურთ წაშალოთ{" "}
            <span className="font-semibold text-foreground">{deletingProduct?.name.ka}</span>?
            {deletingProduct && deletingProduct.variantCount > 0 && (
              <>
                {" "}
                ამ პროდუქტს აქვს{" "}
                <span className="font-semibold text-foreground">
                  {deletingProduct.variantCount} ვარიანტი
                </span>{" "}
                — ისინიც (სურათებითა და ფასდაკლებებით ერთად) სრულად წაიშლება ამ მოქმედებით.
              </>
            )}{" "}
            ამ მოქმედების გაუქმება შეუძლებელია.
          </>
        }
        successMessage="პროდუქტი წაიშალა"
        onConfirm={async () => {
          if (!deletingProduct) return;
          await deleteProduct(deletingProduct.id);
          await loadPage(data.page);
        }}
      />
    </div>
  );
}
