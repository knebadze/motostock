"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { RowActions } from "@/components/shared/RowActions";
import { DataTable, type DataTableColumn } from "@/components/shared/DataTable";
import { Pagination, usePagination } from "@/components/shared/Pagination";
import { AdminFilterPanel } from "@/components/admin/shared/AdminFilterPanel";
import { deleteProduct, listProducts, type Product } from "@/lib/api/products";
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
    render: (product) => product.productBrand?.name.ka ?? "—",
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
  initialProducts,
  categories,
  productBrands,
  sizes,
  colors,
  conditions,
  statuses,
}: {
  initialProducts: Product[];
  categories: Category[];
  productBrands: ProductBrand[];
  sizes: LookupItem[];
  colors: LookupItem[];
  conditions: LookupItem[];
  statuses: LookupItem[];
}) {
  const router = useRouter();
  const [products, setProducts] = useState(initialProducts);
  const [adminFilters, setAdminFilters] = useState<AdminFilterEntry[]>([]);
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);
  const [viewingProductId, setViewingProductId] = useState<number | null>(null);
  const { page, setPage, pageItems, totalPages } = usePagination(products);

  const canCreate = categories.length > 0;

  const filterFields = buildProductFilterFields({
    categories,
    productBrands,
    sizes,
    colors,
    conditions,
    statuses,
  });

  async function refresh(filters: AdminFilterEntry[] = adminFilters) {
    try {
      setProducts(await listProducts({ adminFilters: filters }));
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
    await refresh(filters);
    setPage(1);
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
          data={pageItems}
          getRowKey={(product) => product.id}
          emptyMessage="პროდუქტი არ არსებობს"
          actions={(product) => (
            <RowActions
              onView={() => setViewingProductId(product.id)}
              onEdit={() => router.push(`/admin/products/${product.id}`)}
              onDelete={() => setDeletingProduct(product)}
            />
          )}
        />
        <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
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
          await refresh();
        }}
      />
    </div>
  );
}
