"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Select } from "@/components/shared/Select";
import { DataTable, type DataTableColumn } from "@/components/shared/DataTable";
import {
  createProductBuyTogether,
  deleteProductBuyTogether,
  listProductBuyTogether,
  type ProductBuyTogether,
} from "@/lib/api/product-buy-together";
import type { Product } from "@/lib/api/products";
import { ApiRequestError } from "@/lib/api/client";

function productLabel(product: Product): string {
  return `${product.name.ka} — ${product.category.name.ka}`;
}

const columns: DataTableColumn<ProductBuyTogether>[] = [
  { header: "პროდუქტი", render: (link) => link.relatedProduct.name.ka },
  {
    header: "კატეგორია",
    render: (link) => link.relatedProduct.category.name.ka,
    cellClassName: "text-muted-foreground",
  },
];

export function ProductBuyTogetherPanel({
  productId,
  allProducts,
}: {
  productId: number;
  allProducts: Product[];
}) {
  const [links, setLinks] = useState<ProductBuyTogether[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [relatedProductId, setRelatedProductId] = useState("");
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    let cancelled = false;

    listProductBuyTogether(productId)
      .then((items) => {
        if (!cancelled) setLinks(items);
      })
      .catch(() => {
        toast.error("სიის ჩატვირთვა ვერ მოხერხდა");
      })
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });

    return () => {
      cancelled = true;
    };
  }, [productId]);

  const attachedIds = new Set(links.map((link) => link.relatedProduct.id));
  const options = useMemo(
    () =>
      allProducts
        .filter((product) => product.id !== productId && !attachedIds.has(product.id))
        .map((product) => ({ value: String(product.id), label: productLabel(product) })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [allProducts, links, productId],
  );

  async function refresh() {
    setLinks(await listProductBuyTogether(productId));
  }

  async function handleAdd() {
    if (!relatedProductId) {
      toast.error("აირჩიეთ პროდუქტი");
      return;
    }

    setAdding(true);
    try {
      await createProductBuyTogether(productId, Number(relatedProductId));
      setRelatedProductId("");
      await refresh();
      toast.success("პროდუქტი დაემატა");
    } catch (error) {
      const message = error instanceof ApiRequestError ? error.message : "დამატება ვერ მოხერხდა";
      toast.error(message);
    } finally {
      setAdding(false);
    }
  }

  async function handleDelete(link: ProductBuyTogether) {
    try {
      await deleteProductBuyTogether(productId, link.id);
      await refresh();
      toast.success("პროდუქტი წაიშალა");
    } catch (error) {
      const message = error instanceof ApiRequestError ? error.message : "წაშლა ვერ მოხერხდა";
      toast.error(message);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-muted-foreground">
        მომხმარებელს პროდუქტის გვერდზე ეს პროდუქტები შესთავაზება ერთად შესაძენად (მაგ. ჯაჭვთან
        ერთად — საწმენდი სითხე და ჩოთქი). თანმიმდევრობა არასავალდებულოა.
      </p>

      {loaded && (
        <DataTable
          columns={columns}
          data={links}
          getRowKey={(link) => link.id}
          emptyMessage="პროდუქტი არ არის დამატებული"
          actions={(link) => (
            <button
              type="button"
              onClick={() => handleDelete(link)}
              className="rounded-full px-3 py-1 text-xs font-semibold text-red-600 transition-colors hover:bg-red-500/10"
            >
              წაშლა
            </button>
          )}
        />
      )}

      <div className="flex gap-3">
        <div className="flex-1">
          <Select
            options={options}
            value={relatedProductId}
            onChange={setRelatedProductId}
            searchable
            placeholder="აირჩიეთ პროდუქტი"
          />
        </div>
        <button
          type="button"
          onClick={handleAdd}
          disabled={adding}
          className="rounded-full border border-border px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:border-primary hover:text-primary disabled:opacity-50"
        >
          + დამატება
        </button>
      </div>
    </div>
  );
}
