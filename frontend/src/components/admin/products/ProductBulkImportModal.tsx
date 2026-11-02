"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { Modal } from "@/components/shared/Modal";
import { Select } from "@/components/shared/Select";
import {
  bulkImportProducts,
  downloadProductImportTemplate,
  type ProductBulkImportResult,
} from "@/lib/api/products";
import type { Category } from "@/lib/api/categories";
import { ApiRequestError } from "@/lib/api/client";
import { flattenTree, isVehicleCategory } from "@/lib/categories-tree";

const STATUS_LABELS: Record<ProductBulkImportResult["results"][number]["status"], string> = {
  created: "დაემატა",
  skipped: "გამოტოვდა",
  error: "შეცდომა",
};

// Excel bulk import: pick a category → download its template (its own
// attribute columns, dropdowns) → upload the filled file → per-row results.
export function ProductBulkImportModal({
  open,
  onClose,
  onImported,
  categories,
}: {
  open: boolean;
  onClose: () => void;
  onImported: () => void;
  categories: Category[];
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [categoryId, setCategoryId] = useState("");
  const [downloading, setDownloading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<ProductBulkImportResult | null>(null);

  const categoryOptions = flattenTree(
    categories.filter((category) => !isVehicleCategory(categories, category.id)),
  ).map((category) => ({ value: String(category.id), label: `${"— ".repeat(category.depth)}${category.name.ka}` }));

  function handleClose() {
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    onClose();
  }

  async function handleDownloadTemplate() {
    if (!categoryId) {
      toast.error("ჯერ აირჩიეთ კატეგორია");
      return;
    }
    const category = categories.find((item) => String(item.id) === categoryId);
    setDownloading(true);
    try {
      await downloadProductImportTemplate(Number(categoryId), `products-${category?.slug ?? categoryId}.xlsx`);
    } catch (error) {
      toast.error(error instanceof ApiRequestError ? error.message : "შაბლონის გადმოწერა ვერ მოხერხდა");
    } finally {
      setDownloading(false);
    }
  }

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setResult(null);
    try {
      const importResult = await bulkImportProducts(file);
      setResult(importResult);
      if (importResult.createdProducts > 0) {
        toast.success(`დაემატა ${importResult.createdProducts} პროდუქტი (${importResult.createdVariants} ვარიანტი)`);
        onImported();
      } else if (importResult.totalRows === 0) {
        toast.error("ფაილში შევსებული რიგები ვერ მოიძებნა");
      }
    } catch (error) {
      toast.error(error instanceof ApiRequestError ? error.message : "ფაილის ატვირთვა ვერ მოხერხდა");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  const problemRows = result?.results.filter((row) => row.status !== "created") ?? [];

  return (
    <Modal open={open} onClose={handleClose} title="პროდუქტების ატვირთვა Excel-ით" size="xl">
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-3 rounded-xl border border-border bg-muted/40 p-4">
          <p className="text-sm text-foreground">
            1. აირჩიეთ კატეგორია და გადმოწერეთ მისი შაბლონი — მასში ამ კატეგორიის მახასიათებლების სვეტებია, ბრენდი,
            ზომა, ფერი და მახასიათებლები კი ჩამოსაშლელი სიიდან ირჩევა. ერთი ფაილი = ერთი კატეგორია.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="flex-1">
              <Select
                options={categoryOptions}
                value={categoryId}
                onChange={setCategoryId}
                searchable
                placeholder="— აირჩიეთ კატეგორია —"
                ariaLabel="კატეგორია"
              />
            </div>
            <button
              type="button"
              onClick={handleDownloadTemplate}
              disabled={downloading || !categoryId}
              className="rounded-full border border-border px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-muted disabled:opacity-50"
            >
              {downloading ? "იტვირთება..." : "შაბლონის გადმოწერა"}
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="product-import-file" className="text-sm font-medium text-foreground">
            2. შევსებული ფაილის ატვირთვა
          </label>
          <input
            id="product-import-file"
            ref={fileInputRef}
            type="file"
            accept=".xlsx"
            onChange={handleFileChange}
            disabled={uploading}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none file:mr-3 file:rounded-full file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-primary-foreground disabled:opacity-50"
          />
          <p className="text-xs text-muted-foreground">
            ფაილს კატეგორია თავად ახსოვს. უკვე არსებული პროდუქტები გამოტოვდება, ამიტომ შესწორებული ფაილის ხელახლა
            ატვირთვა უსაფრთხოა. ფოტოები და თავსებადობა ატვირთვის შემდეგ ემატება.
          </p>
          {uploading && <p className="text-sm text-muted-foreground">მიმდინარეობს დამუშავება...</p>}
        </div>

        {result && (
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap gap-4 text-sm">
              <span className="text-foreground">კატეგორია: {result.categoryName}</span>
              <span className="text-foreground">რიგი: {result.totalRows}</span>
              <span className="font-semibold text-success">
                დაემატა: {result.createdProducts} პროდუქტი / {result.createdVariants} ვარიანტი
              </span>
              <span className="text-muted-foreground">გამოტოვდა: {result.skippedCount}</span>
              <span className="font-semibold text-destructive">შეცდომა: {result.errorCount}</span>
            </div>

            {problemRows.length > 0 && (
              <div className="max-h-72 overflow-y-auto rounded-xl border border-border">
                <table className="w-full text-left text-sm">
                  <thead className="sticky top-0 bg-muted text-xs text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 font-medium">რიგი</th>
                      <th className="px-3 py-2 font-medium">სტატუსი</th>
                      <th className="px-3 py-2 font-medium">მიზეზი</th>
                    </tr>
                  </thead>
                  <tbody>
                    {problemRows.map((row) => (
                      <tr key={row.row} className="border-t border-border">
                        <td className="px-3 py-2 text-muted-foreground">{row.row}</td>
                        <td className="px-3 py-2">{STATUS_LABELS[row.status]}</td>
                        <td
                          className={`px-3 py-2 ${row.status === "error" ? "text-destructive" : "text-muted-foreground"}`}
                        >
                          {row.message}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
