"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { DataTable, type DataTableColumn } from "@/components/shared/DataTable";
import { Pagination, usePagination } from "@/components/shared/Pagination";
import { Select } from "@/components/shared/Select";
import { formatDateTime } from "@/lib/format";
import { ApiRequestError } from "@/lib/api/client";
import {
  listAllProductBuyTogether,
  type AdminProductBuyTogether,
  type ListProductBuyTogetherFilters,
} from "@/lib/api/product-buy-together";
import type { Category } from "@/lib/api/categories";

const columns: DataTableColumn<AdminProductBuyTogether>[] = [
  {
    header: "საწყისი პროდუქტი",
    render: (item) => (
      <div>
        <p>{item.product.name.ka}</p>
        <p className="text-xs text-muted-foreground">{item.product.category.name.ka}</p>
      </div>
    ),
  },
  {
    header: "→ ერთად შემოთავაზებული",
    render: (item) => (
      <div>
        <p>{item.relatedProduct.name.ka}</p>
        <p className="text-xs text-muted-foreground">{item.relatedProduct.category.name.ka}</p>
      </div>
    ),
  },
  {
    header: "თარიღი",
    render: (item) => formatDateTime(item.createdAt),
    cellClassName: "text-muted-foreground",
  },
];

export function BuyTogetherManager({
  initialItems,
  categories,
}: {
  initialItems: AdminProductBuyTogether[];
  categories: Category[];
}) {
  const [items, setItems] = useState(initialItems);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const { page, setPage, pageItems, totalPages } = usePagination(items);

  const categoryOptions = categories.map((category) => ({
    value: String(category.id),
    label: category.name.ka,
  }));
  const hasActiveFilters = search.trim() !== "" || categoryId !== "";

  async function fetchItems(filters: ListProductBuyTogetherFilters) {
    setLoading(true);
    try {
      setItems(await listAllProductBuyTogether(filters));
      setPage(1);
    } catch (error) {
      toast.error(error instanceof ApiRequestError ? error.message : "სიის ჩატვირთვა ვერ მოხერხდა");
    } finally {
      setLoading(false);
    }
  }

  function handleApplyFilters() {
    fetchItems({
      search: search.trim() || undefined,
      categoryId: categoryId ? Number(categoryId) : undefined,
    });
  }

  function handleClearFilters() {
    setSearch("");
    setCategoryId("");
    fetchItems({});
  }

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">ერთად შეძენა</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        ყველა პროდუქტის ერთად შეძენის კავშირების ერთიანი მიმოხილვა.
      </p>

      <div className="mt-6 flex flex-wrap items-end gap-3 rounded-2xl border border-border bg-card p-4">
        <div className="flex min-w-48 flex-1 flex-col gap-1.5">
          <label className="text-xs font-medium text-muted-foreground">ძებნა</label>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="პროდუქტის სახელი"
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          />
        </div>
        <div className="flex w-48 flex-col gap-1.5">
          <label htmlFor="buy-together-category" className="text-xs font-medium text-muted-foreground">
            კატეგორია
          </label>
          <Select
            id="buy-together-category"
            options={categoryOptions}
            value={categoryId}
            onChange={setCategoryId}
            searchable
            placeholder="ყველა"
          />
        </div>
        <button
          type="button"
          onClick={handleApplyFilters}
          disabled={loading}
          className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover disabled:opacity-50"
        >
          გაფილტვრა
        </button>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={handleClearFilters}
            disabled={loading}
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary disabled:opacity-50"
          >
            გაწმენდა
          </button>
        )}
      </div>

      <div className="mt-6">
        <DataTable
          columns={columns}
          data={pageItems}
          getRowKey={(item) => item.id}
          emptyMessage="კავშირი არ მოიძებნა"
          actions={(item) => (
            <div className="flex justify-end">
              <Link
                href={`/admin/products/${item.product.id}`}
                className="text-sm font-medium text-primary hover:underline"
              >
                ნახვა
              </Link>
            </div>
          )}
        />
        <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
      </div>
    </div>
  );
}
