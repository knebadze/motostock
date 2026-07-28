"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { DataTable, type DataTableColumn } from "@/components/shared/DataTable";
import { Select } from "@/components/shared/Select";
import { Toggle } from "@/components/shared/Toggle";
import { FieldError } from "@/components/shared/FieldError";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import {
  createProductVariant,
  deleteProductVariant,
  listProductVariants,
  updateProductVariant,
  type ProductVariant,
} from "@/lib/api/product-variants";
import type { LookupItem } from "@/lib/api/lookups";
import { ApiRequestError } from "@/lib/api/client";
import { formatPrice } from "@/lib/format";
import { generateVariantCombinations } from "@/lib/variant-matrix";
import { productVariantFormSchema } from "@/lib/validation/product-variants";
import { getFieldErrors, type FieldErrors } from "@/lib/validation/common";
import { ProductVariantImagesPanel } from "./ProductVariantImagesPanel";
import { ProductVariantDiscountsPanel } from "./ProductVariantDiscountsPanel";

function lookupOptions(items: LookupItem[]) {
  return items.map((item) => ({ value: String(item.id), label: item.nameKa }));
}

function getDefaultAddForm(conditions: LookupItem[], statuses: LookupItem[]) {
  return {
    sizeIds: [] as string[],
    colorIds: [] as string[],
    conditionId: String(conditions.find((c) => c.key === "NEW")?.id ?? ""),
    statusId: String(statuses.find((s) => s.key === "AVAILABLE")?.id ?? ""),
    price: "",
    stockQuantity: "1",
    sku: "",
    isActive: true,
  };
}

const EMPTY_EDIT_FORM = {
  sizeId: "",
  colorId: "",
  conditionId: "",
  statusId: "",
  price: "",
  stockQuantity: "1",
  sku: "",
  finaId: "",
  isActive: true,
};

export function ProductVariantsPanel({
  productId,
  sizes,
  colors,
  conditions,
  statuses,
}: {
  productId: number;
  sizes: LookupItem[];
  colors: LookupItem[];
  conditions: LookupItem[];
  statuses: LookupItem[];
}) {
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [managingVariant, setManagingVariant] = useState<ProductVariant | null>(null);
  const [deletingVariant, setDeletingVariant] = useState<ProductVariant | null>(null);

  const [addForm, setAddForm] = useState(() => getDefaultAddForm(conditions, statuses));
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});

  const [editingVariant, setEditingVariant] = useState<ProductVariant | null>(null);
  const [editForm, setEditForm] = useState(EMPTY_EDIT_FORM);

  useEffect(() => {
    let cancelled = false;

    listProductVariants(productId)
      .then((items) => {
        if (!cancelled) setVariants(items);
      })
      .catch(() => {
        toast.error("ვარიანტების ჩატვირთვა ვერ მოხერხდა");
      })
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });

    return () => {
      cancelled = true;
    };
  }, [productId]);

  async function refresh() {
    const items = await listProductVariants(productId);
    setVariants(items);
    if (managingVariant) {
      setManagingVariant(items.find((item) => item.id === managingVariant.id) ?? null);
    }
  }

  async function handleGenerate() {
    const result = productVariantFormSchema.safeParse({
      price: addForm.price,
      stockQuantity: addForm.stockQuantity,
    });
    if (!result.success) {
      setErrors(getFieldErrors(result.error));
      toast.error("გთხოვთ შეასწოროთ ველები");
      return;
    }
    setErrors({});

    const combinations = generateVariantCombinations(
      addForm.sizeIds.map(Number),
      addForm.colorIds.map(Number),
    );
    const conditionId = addForm.conditionId ? Number(addForm.conditionId) : null;
    const statusId = addForm.statusId ? Number(addForm.statusId) : null;

    setSaving(true);
    try {
      for (const combo of combinations) {
        await createProductVariant({
          productId,
          sizeId: combo.sizeId,
          colorId: combo.colorId,
          conditionId,
          statusId,
          price: Number(addForm.price),
          stockQuantity: addForm.stockQuantity ? Number(addForm.stockQuantity) : undefined,
          sku: addForm.sku.trim() ? addForm.sku.trim() : null,
          isActive: addForm.isActive,
        });
      }
      setAddForm(getDefaultAddForm(conditions, statuses));
      await refresh();
      toast.success(
        combinations.length > 1 ? `${combinations.length} ვარიანტი დაემატა` : "ვარიანტი დაემატა",
      );
    } catch (error) {
      const message =
        error instanceof ApiRequestError ? error.message : "დამატება ვერ მოხერხდა";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  function handleStartEdit(variant: ProductVariant) {
    setEditingVariant(variant);
    setEditForm({
      sizeId: variant.size ? String(variant.size.id) : "",
      colorId: variant.color ? String(variant.color.id) : "",
      conditionId: variant.condition ? String(variant.condition.id) : "",
      statusId: variant.status ? String(variant.status.id) : "",
      price: String(variant.price),
      stockQuantity: String(variant.stockQuantity),
      sku: variant.sku ?? "",
      finaId: variant.finaId != null ? String(variant.finaId) : "",
      isActive: variant.isActive,
    });
    setErrors({});
  }

  function handleCancelEdit() {
    setEditingVariant(null);
    setEditForm(EMPTY_EDIT_FORM);
    setErrors({});
  }

  async function handleSaveEdit() {
    if (!editingVariant) return;

    const result = productVariantFormSchema.safeParse({
      price: editForm.price,
      stockQuantity: editForm.stockQuantity,
    });
    if (!result.success) {
      setErrors(getFieldErrors(result.error));
      toast.error("გთხოვთ შეასწოროთ ველები");
      return;
    }
    setErrors({});

    setSaving(true);
    try {
      await updateProductVariant(editingVariant.id, {
        sizeId: editForm.sizeId ? Number(editForm.sizeId) : null,
        colorId: editForm.colorId ? Number(editForm.colorId) : null,
        conditionId: editForm.conditionId ? Number(editForm.conditionId) : null,
        statusId: editForm.statusId ? Number(editForm.statusId) : null,
        price: Number(editForm.price),
        stockQuantity: editForm.stockQuantity ? Number(editForm.stockQuantity) : undefined,
        sku: editForm.sku.trim() ? editForm.sku.trim() : null,
        finaId: editForm.finaId.trim() ? Number(editForm.finaId) : null,
        isActive: editForm.isActive,
      });
      handleCancelEdit();
      await refresh();
      toast.success("ვარიანტი განახლდა");
    } catch (error) {
      const message =
        error instanceof ApiRequestError ? error.message : "შენახვა ვერ მოხერხდა";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  const columns: DataTableColumn<ProductVariant>[] = [
    { header: "SKU", render: (variant) => variant.sku ?? "—", cellClassName: "font-mono text-muted-foreground" },
    { header: "ზომა", render: (variant) => variant.size?.nameKa ?? "—" },
    { header: "ფერი", render: (variant) => variant.color?.nameKa ?? "—" },
    {
      header: "ფასი",
      render: (variant) =>
        variant.activeDiscount ? (
          <span className="flex items-center gap-2">
            <span className="text-muted-foreground line-through">{formatPrice(variant.price)}</span>
            <span className="font-semibold text-primary">
              {formatPrice(variant.activeDiscount.discountPrice)}
            </span>
          </span>
        ) : (
          formatPrice(variant.price)
        ),
    },
    { header: "მარაგი", render: (variant) => variant.stockQuantity },
    {
      header: "FINA ID",
      render: (variant) => variant.finaId ?? "—",
      cellClassName: "font-mono text-muted-foreground",
    },
    { header: "სტატუსი", render: (variant) => variant.status?.nameKa ?? "—", cellClassName: "text-muted-foreground" },
    {
      header: "აქტიური",
      render: (variant) => (
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
            variant.isActive ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
          }`}
        >
          {variant.isActive ? "აქტიური" : "გამორთული"}
        </span>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      {loaded && (
        <DataTable
          columns={columns}
          data={variants}
          getRowKey={(variant) => variant.id}
          emptyMessage="ვარიანტი არ არსებობს"
          actions={(variant) => (
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => handleStartEdit(variant)}
                className="rounded-full px-3 py-1 text-xs font-semibold text-foreground transition-colors hover:bg-muted"
              >
                რედაქტირება
              </button>
              <button
                type="button"
                onClick={() => setManagingVariant(variant)}
                className="rounded-full px-3 py-1 text-xs font-semibold text-primary transition-colors hover:bg-primary/10"
              >
                სურათები/ფასდაკლება
              </button>
              <button
                type="button"
                onClick={() => setDeletingVariant(variant)}
                className="rounded-full px-3 py-1 text-xs font-semibold text-red-600 transition-colors hover:bg-red-500/10"
              >
                წაშლა
              </button>
            </div>
          )}
        />
      )}

      {editingVariant ? (
        <div className="rounded-lg border border-primary/40 bg-primary/5 p-3">
          <h3 className="text-sm font-semibold">ვარიანტის რედაქტირება</h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-muted-foreground">ზომა</label>
              <Select
                options={lookupOptions(sizes)}
                value={editForm.sizeId}
                onChange={(value) => setEditForm((prev) => ({ ...prev, sizeId: value }))}
                searchable
                placeholder="— არცერთი —"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-muted-foreground">ფერი</label>
              <Select
                options={lookupOptions(colors)}
                value={editForm.colorId}
                onChange={(value) => setEditForm((prev) => ({ ...prev, colorId: value }))}
                searchable
                placeholder="— არცერთი —"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-muted-foreground">მდგომარეობა</label>
              <Select
                options={lookupOptions(conditions)}
                value={editForm.conditionId}
                onChange={(value) => setEditForm((prev) => ({ ...prev, conditionId: value }))}
                searchable
                placeholder="— არცერთი —"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-muted-foreground">სტატუსი</label>
              <Select
                options={lookupOptions(statuses)}
                value={editForm.statusId}
                onChange={(value) => setEditForm((prev) => ({ ...prev, statusId: value }))}
                searchable
                placeholder="— არცერთი —"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-muted-foreground">SKU</label>
              <input
                type="text"
                value={editForm.sku}
                onChange={(event) => setEditForm((prev) => ({ ...prev, sku: event.target.value }))}
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm font-mono outline-none focus:border-primary"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-muted-foreground">FINA ID</label>
              <input
                type="number"
                value={editForm.finaId}
                onChange={(event) => setEditForm((prev) => ({ ...prev, finaId: event.target.value }))}
                placeholder="მარაგის სინქრონიზაციისთვის"
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm font-mono outline-none focus:border-primary"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-muted-foreground">ფასი *</label>
              <input
                type="number"
                step="0.01"
                value={editForm.price}
                onChange={(event) => setEditForm((prev) => ({ ...prev, price: event.target.value }))}
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              />
              <FieldError message={errors.price} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-muted-foreground">მარაგში (ცალი)</label>
              <input
                type="number"
                min={0}
                value={editForm.stockQuantity}
                onChange={(event) => setEditForm((prev) => ({ ...prev, stockQuantity: event.target.value }))}
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              />
              <FieldError message={errors.stockQuantity} />
            </div>
            <label className="flex items-center gap-2 self-end pb-2 text-sm font-medium">
              <Toggle checked={editForm.isActive} onChange={(checked) => setEditForm((prev) => ({ ...prev, isActive: checked }))} />
              აქტიურია
            </label>
          </div>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={handleSaveEdit}
              disabled={saving}
              className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover disabled:opacity-50"
            >
              შენახვა
            </button>
            <button
              type="button"
              onClick={handleCancelEdit}
              className="rounded-full px-4 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted"
            >
              გაუქმება
            </button>
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-border p-3">
          <h3 className="text-sm font-semibold">ვარიანტების დამატება</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            აირჩიეთ რამდენიმე ზომა და/ან ფერი — გენერირდება ყველა კომბინაცია ერთდროულად (მაგ. 3
            ზომა × 2 ფერი = 6 ვარიანტი). თუ არცერთს აირჩევთ, დაემატება ერთი ვარიანტი.
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-muted-foreground">ზომები</label>
              <Select
                multiple
                options={lookupOptions(sizes)}
                value={addForm.sizeIds}
                onChange={(value) => setAddForm((prev) => ({ ...prev, sizeIds: value }))}
                searchable
                placeholder="— არცერთი —"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-muted-foreground">ფერები</label>
              <Select
                multiple
                options={lookupOptions(colors)}
                value={addForm.colorIds}
                onChange={(value) => setAddForm((prev) => ({ ...prev, colorIds: value }))}
                searchable
                placeholder="— არცერთი —"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-muted-foreground">მდგომარეობა</label>
              <Select
                options={lookupOptions(conditions)}
                value={addForm.conditionId}
                onChange={(value) => setAddForm((prev) => ({ ...prev, conditionId: value }))}
                searchable
                placeholder="— არცერთი —"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-muted-foreground">სტატუსი</label>
              <Select
                options={lookupOptions(statuses)}
                value={addForm.statusId}
                onChange={(value) => setAddForm((prev) => ({ ...prev, statusId: value }))}
                searchable
                placeholder="— არცერთი —"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-muted-foreground">SKU</label>
              <input
                type="text"
                value={addForm.sku}
                onChange={(event) => setAddForm((prev) => ({ ...prev, sku: event.target.value }))}
                placeholder="საერთო ყველასთვის, ან ცარიელი"
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm font-mono outline-none focus:border-primary"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-muted-foreground">ფასი *</label>
              <input
                type="number"
                step="0.01"
                value={addForm.price}
                onChange={(event) => setAddForm((prev) => ({ ...prev, price: event.target.value }))}
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              />
              <FieldError message={errors.price} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-muted-foreground">მარაგში (ცალი)</label>
              <input
                type="number"
                min={1}
                value={addForm.stockQuantity}
                onChange={(event) => setAddForm((prev) => ({ ...prev, stockQuantity: event.target.value }))}
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              />
              <FieldError message={errors.stockQuantity} />
            </div>
            <label className="flex items-center gap-2 self-end pb-2 text-sm font-medium">
              <Toggle checked={addForm.isActive} onChange={(checked) => setAddForm((prev) => ({ ...prev, isActive: checked }))} />
              აქტიურია
            </label>
          </div>
          <button
            type="button"
            onClick={handleGenerate}
            disabled={saving}
            className="mt-3 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover disabled:opacity-50"
          >
            + ვარიანტების გენერაცია
          </button>
        </div>
      )}

      {managingVariant && (
        <div className="flex flex-col gap-4 rounded-lg border border-primary/40 bg-primary/5 p-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">
              ვარიანტის მართვა — {managingVariant.size?.nameKa ?? "?"} / {managingVariant.color?.nameKa ?? "?"}
            </h3>
            <button
              type="button"
              onClick={() => setManagingVariant(null)}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              დახურვა ×
            </button>
          </div>
          <ProductVariantImagesPanel variantId={managingVariant.id} />
          <ProductVariantDiscountsPanel variantId={managingVariant.id} basePrice={managingVariant.price} />
        </div>
      )}

      <ConfirmDialog
        open={deletingVariant !== null}
        onClose={() => setDeletingVariant(null)}
        title="ვარიანტის წაშლა"
        message="დარწმუნებული ხართ, რომ გსურთ წაშალოთ ეს ვარიანტი? ამ მოქმედების გაუქმება შეუძლებელია."
        successMessage="ვარიანტი წაიშალა"
        onConfirm={async () => {
          if (!deletingVariant) return;
          await deleteProductVariant(deletingVariant.id);
          if (managingVariant?.id === deletingVariant.id) setManagingVariant(null);
          if (editingVariant?.id === deletingVariant.id) handleCancelEdit();
          await refresh();
        }}
      />
    </div>
  );
}
