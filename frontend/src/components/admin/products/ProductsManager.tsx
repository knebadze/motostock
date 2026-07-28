"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Select } from "@/components/shared/Select";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { RowActions } from "@/components/shared/RowActions";
import { DataTable, type DataTableColumn } from "@/components/shared/DataTable";
import { Pagination, usePagination } from "@/components/shared/Pagination";
import { deleteProduct, listProducts, type Product } from "@/lib/api/products";
import { resolveMediaUrl, ApiRequestError } from "@/lib/api/client";
import type { Category } from "@/lib/api/categories";
import { flattenTree } from "@/lib/categories-tree";
import { formatPrice } from "@/lib/format";

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
];

export function ProductsManager({
  initialProducts,
  categories,
}: {
  initialProducts: Product[];
  categories: Category[];
}) {
  const router = useRouter();
  const [products, setProducts] = useState(initialProducts);
  const [categoryFilter, setCategoryFilter] = useState("");
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);
  const { page, setPage, pageItems, totalPages } = usePagination(products);

  const canCreate = categories.length > 0;

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
      setProducts(await listProducts(filter ? Number(filter) : undefined));
    } catch (error) {
      const message =
        error instanceof ApiRequestError ? error.message : "სიის განახლება ვერ მოხერხდა";
      toast.error(message);
    }
  }

  async function handleFilterChange(value: string) {
    setCategoryFilter(value);
    setPage(1);
    await refresh(value);
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
          data={pageItems}
          getRowKey={(product) => product.id}
          emptyMessage="პროდუქტი არ არსებობს"
          actions={(product) => (
            <RowActions
              onEdit={() => router.push(`/admin/products/${product.id}`)}
              onDelete={() => setDeletingProduct(product)}
            />
          )}
        />
        <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
      </div>

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
