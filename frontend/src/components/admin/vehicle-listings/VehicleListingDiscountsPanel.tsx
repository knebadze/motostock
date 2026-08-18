"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { DataTable, type DataTableColumn } from "@/components/shared/DataTable";
import { FieldError } from "@/components/shared/FieldError";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import {
  createVehicleListingDiscount,
  deleteVehicleListingDiscount,
  listVehicleListingDiscounts,
  type VehicleListingDiscount,
} from "@/lib/api/vehicle-listing-discounts";
import { ApiRequestError } from "@/lib/api/client";
import { formatPrice } from "@/lib/format";
import { vehicleListingDiscountFormSchema } from "@/lib/validation/vehicle-listing-discounts";
import { getFieldErrors, type FieldErrors } from "@/lib/validation/common";

const columns: DataTableColumn<VehicleListingDiscount>[] = [
  {
    header: "ფასდაკლების ფასი",
    render: (discount) => formatPrice(discount.discountPrice),
  },
  {
    header: "პროცენტი",
    render: (discount) => (discount.discountPercent != null ? `${discount.discountPercent}%` : "—"),
    cellClassName: "text-muted-foreground",
  },
  { header: "დაწყება", render: (discount) => discount.startDate, cellClassName: "text-muted-foreground" },
  { header: "დასრულება", render: (discount) => discount.endDate, cellClassName: "text-muted-foreground" },
];

export function VehicleListingDiscountsPanel({
  listingId,
  basePrice,
}: {
  listingId: number;
  basePrice: number;
}) {
  const [discounts, setDiscounts] = useState<VehicleListingDiscount[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [discountPercent, setDiscountPercent] = useState("");
  const [discountPrice, setDiscountPrice] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [adding, setAdding] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [deletingDiscount, setDeletingDiscount] = useState<VehicleListingDiscount | null>(null);

  useEffect(() => {
    let cancelled = false;

    listVehicleListingDiscounts(listingId)
      .then((items) => {
        if (!cancelled) setDiscounts(items);
      })
      .catch(() => {
        toast.error("ფასდაკლებების ჩატვირთვა ვერ მოხერხდა");
      })
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });

    return () => {
      cancelled = true;
    };
  }, [listingId]);

  async function refresh() {
    setDiscounts(await listVehicleListingDiscounts(listingId));
  }

  function handlePercentChange(value: string) {
    setDiscountPercent(value);

    const percentNum = Number(value);
    if (value.trim() !== "" && Number.isFinite(percentNum) && percentNum >= 0 && percentNum <= 100) {
      setDiscountPrice((basePrice * (1 - percentNum / 100)).toFixed(2));
    }
  }

  async function handleAdd() {
    const result = vehicleListingDiscountFormSchema.safeParse({
      discountPrice,
      discountPercent,
      startDate,
      endDate,
    });
    if (!result.success) {
      setErrors(getFieldErrors(result.error));
      toast.error("გთხოვთ შეასწოროთ ველები");
      return;
    }
    setErrors({});

    setAdding(true);
    try {
      await createVehicleListingDiscount(listingId, {
        discountPrice: Number(discountPrice),
        discountPercent: discountPercent ? Number(discountPercent) : null,
        startDate,
        endDate,
      });
      setDiscountPercent("");
      setDiscountPrice("");
      setStartDate("");
      setEndDate("");
      setErrors({});
      await refresh();
      toast.success("ფასდაკლება დაემატა");
    } catch (error) {
      const message =
        error instanceof ApiRequestError ? error.message : "დამატება ვერ მოხერხდა";
      toast.error(message);
    } finally {
      setAdding(false);
    }
  }

  async function handleDelete() {
    if (!deletingDiscount) return;
    await deleteVehicleListingDiscount(listingId, deletingDiscount.id);
    await refresh();
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border p-3">
      <h3 className="text-sm font-semibold">ფასდაკლებები</h3>

      {loaded && (
        <DataTable
          columns={columns}
          data={discounts}
          getRowKey={(discount) => discount.id}
          emptyMessage="ფასდაკლება არ არსებობს"
          actions={(discount) => (
            <button
              type="button"
              onClick={() => setDeletingDiscount(discount)}
              className="rounded-full px-3 py-1 text-xs font-semibold text-red-600 transition-colors hover:bg-red-500/10"
            >
              წაშლა
            </button>
          )}
        />
      )}

      <ConfirmDialog
        open={deletingDiscount !== null}
        onClose={() => setDeletingDiscount(null)}
        title="ფასდაკლების წაშლა"
        message={
          <>
            დარწმუნებული ხართ, რომ გსურთ წაშალოთ ფასდაკლება{" "}
            <span className="font-semibold text-foreground">
              {deletingDiscount ? formatPrice(deletingDiscount.discountPrice) : ""}
            </span>
            ? ამ მოქმედების გაუქმება შეუძლებელია.
          </>
        }
        successMessage="ფასდაკლება წაიშალა"
        onConfirm={handleDelete}
      />

      <div className="grid gap-3 sm:grid-cols-5">
        <div className="flex flex-col gap-1.5">
          <input
            type="number"
            min={0}
            max={100}
            step="0.01"
            placeholder="ფასდაკლება (%)"
            value={discountPercent}
            onChange={(event) => handlePercentChange(event.target.value)}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          />
          <FieldError message={errors.discountPercent} />
        </div>
        <div className="flex flex-col gap-1.5">
          <input
            type="number"
            step="0.01"
            placeholder="ფასდაკლების ფასი *"
            value={discountPrice}
            onChange={(event) => setDiscountPrice(event.target.value)}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          />
          <FieldError message={errors.discountPrice} />
        </div>
        <div className="flex flex-col gap-1.5">
          <input
            type="date"
            value={startDate}
            onChange={(event) => setStartDate(event.target.value)}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          />
          <FieldError message={errors.startDate} />
        </div>
        <div className="flex flex-col gap-1.5">
          <input
            type="date"
            value={endDate}
            onChange={(event) => setEndDate(event.target.value)}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          />
          <FieldError message={errors.endDate} />
        </div>
        <button
          type="button"
          onClick={handleAdd}
          disabled={adding}
          className="h-fit rounded-full border border-border px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:border-primary hover:text-primary disabled:opacity-50"
        >
          + დამატება
        </button>
      </div>
      <p className="text-xs text-muted-foreground">
        პროცენტის მითითებისას ფასდაკლების ფასი ავტომატურად გამოითვლება მიმდინარე ფასიდან
        ({formatPrice(basePrice)}) — შეგიძლიათ შემდეგ ხელითაც შეასწოროთ.
      </p>
    </div>
  );
}
