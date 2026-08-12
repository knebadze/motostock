"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { Modal } from "@/components/shared/Modal";
import {
  bulkImportVehicleCatalog,
  downloadVehicleCatalogTemplate,
  type BulkImportVehicleCatalogResult,
} from "@/lib/api/vehicle-catalog";
import { ApiRequestError } from "@/lib/api/client";

export function VehicleCatalogBulkImportModal({
  open,
  onClose,
  onImported,
}: {
  open: boolean;
  onClose: () => void;
  onImported: () => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [downloading, setDownloading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<BulkImportVehicleCatalogResult | null>(null);

  function handleClose() {
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    onClose();
  }

  async function handleDownloadTemplate() {
    setDownloading(true);
    try {
      await downloadVehicleCatalogTemplate();
    } catch (error) {
      const message =
        error instanceof ApiRequestError ? error.message : "შაბლონის გადმოწერა ვერ მოხერხდა";
      toast.error(message);
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
      const importResult = await bulkImportVehicleCatalog(file);
      setResult(importResult);
      if (importResult.createdCount > 0) {
        toast.success(`დაემატა ${importResult.createdCount} ჩანაწერი`);
        onImported();
      }
      if (importResult.errorCount === 0 && importResult.createdCount === 0) {
        toast.error("ფაილში ატვირთვადი მონაცემები ვერ მოიძებნა");
      }
    } catch (error) {
      const message =
        error instanceof ApiRequestError ? error.message : "ფაილის ატვირთვა ვერ მოხერხდა";
      toast.error(message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  const errorRows = result?.results.filter((row) => row.status === "error") ?? [];

  return (
    <Modal open={open} onClose={handleClose} title="Excel-ით მასობრივი ატვირთვა" size="xl">
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-2 rounded-xl border border-border bg-muted/40 p-4">
          <p className="text-sm text-foreground">
            გადმოწერეთ შაბლონი — მასში შედის საჭირო კლასიფიკატორების ID-ების ცხრილები
            (მარკები, მოდელები და სხვა), რათა სწორად შეავსოთ მონაცემები.
          </p>
          <button
            type="button"
            onClick={handleDownloadTemplate}
            disabled={downloading}
            className="w-fit rounded-full border border-border px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-muted disabled:opacity-50"
          >
            {downloading ? "იტვირთება..." : "შაბლონის გადმოწერა"}
          </button>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-foreground">შევსებული ფაილის ატვირთვა</label>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx"
            onChange={handleFileChange}
            disabled={uploading}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none file:mr-3 file:rounded-full file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-primary-foreground disabled:opacity-50"
          />
          {uploading && <p className="text-sm text-muted-foreground">მიმდინარეობს დამუშავება...</p>}
        </div>

        {result && (
          <div className="flex flex-col gap-3">
            <div className="flex gap-4 text-sm">
              <span className="text-foreground">სულ რიგი: {result.totalRows}</span>
              <span className="font-semibold text-green-600">დაემატა: {result.createdCount}</span>
              <span className="font-semibold text-red-600">შეცდომა: {result.errorCount}</span>
            </div>

            {errorRows.length > 0 && (
              <div className="max-h-64 overflow-y-auto rounded-xl border border-border">
                <table className="w-full text-left text-sm">
                  <thead className="sticky top-0 bg-muted text-xs text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 font-medium">რიგი</th>
                      <th className="px-3 py-2 font-medium">შეცდომა</th>
                    </tr>
                  </thead>
                  <tbody>
                    {errorRows.map((row) => (
                      <tr key={row.row} className="border-t border-border">
                        <td className="px-3 py-2 text-muted-foreground">{row.row}</td>
                        <td className="px-3 py-2 text-red-600">{row.message}</td>
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
