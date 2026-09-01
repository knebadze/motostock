"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Select } from "@/components/shared/Select";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { DataTable, type DataTableColumn } from "@/components/shared/DataTable";
import {
  listProductDiscountHistory,
  type ProductDiscountHistoryRow,
  type ProductDiscountStatus,
} from "@/lib/api/bulk-product-discounts";
import {
  listVehicleDiscountHistory,
  type VehicleDiscountHistoryRow,
} from "@/lib/api/bulk-vehicle-listing-discounts";
import { deleteProductVariantDiscount } from "@/lib/api/product-variant-discounts";
import { deleteVehicleListingDiscount } from "@/lib/api/vehicle-listing-discounts";
import { ApiRequestError } from "@/lib/api/client";
import { formatPrice, toTbilisiDateOnly } from "@/lib/format";

type UnifiedRow = {
  key: string;
  type: "PRODUCT" | "VEHICLE";
  label: string;
  subLabel: string;
  price: number;
  discountPrice: number;
  discountPercent: number | null;
  startDate: string;
  endDate: string;
  computedStatus: ProductDiscountStatus;
  variantId: number | null;
  vehicleListingId: number | null;
  discountId: number;
};

function fromProductRow(row: ProductDiscountHistoryRow): UnifiedRow {
  return {
    key: `product-${row.id}`,
    type: "PRODUCT",
    label: row.productName.ka,
    subLabel: [row.brand?.name, row.size?.nameKa, row.color?.nameKa].filter(Boolean).join(" · ") || "—",
    price: row.price,
    discountPrice: row.discountPrice,
    discountPercent: row.discountPercent,
    startDate: row.startDate,
    endDate: row.endDate,
    computedStatus: row.computedStatus,
    variantId: row.variantId,
    vehicleListingId: null,
    discountId: row.id,
  };
}

function fromVehicleRow(row: VehicleDiscountHistoryRow): UnifiedRow {
  return {
    key: `vehicle-${row.id}`,
    type: "VEHICLE",
    label: `${row.brand.name} ${row.model.name}${row.variant ? ` — ${row.variant}` : ""} (${row.year})`,
    subLabel: [row.condition.nameKa, row.color.nameKa].filter(Boolean).join(" · ") || "—",
    price: row.price,
    discountPrice: row.discountPrice,
    discountPercent: row.discountPercent,
    startDate: row.startDate,
    endDate: row.endDate,
    computedStatus: row.computedStatus,
    variantId: null,
    vehicleListingId: row.vehicleListingId,
    discountId: row.id,
  };
}

const STATUS_LABELS: Record<ProductDiscountStatus, string> = {
  ACTIVE: "აქტიური",
  SCHEDULED: "დაგეგმილი",
  EXPIRED: "ვადაგასული",
};

const STATUS_CLASSES: Record<ProductDiscountStatus, string> = {
  ACTIVE: "bg-green-500/10 text-green-600",
  SCHEDULED: "bg-blue-500/10 text-blue-600",
  EXPIRED: "bg-muted text-muted-foreground",
};

const TYPE_LABELS: Record<UnifiedRow["type"], string> = {
  PRODUCT: "პროდუქტი",
  VEHICLE: "ტრანსპორტი",
};

export function DiscountHistoryPanel() {
  const [rows, setRows] = useState<UnifiedRow[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"" | "active" | "history">("");
  const [typeFilter, setTypeFilter] = useState<"" | "PRODUCT" | "VEHICLE">("");
  const [search, setSearch] = useState("");
  const [deletingRow, setDeletingRow] = useState<UnifiedRow | null>(null);

  async function refresh(overrides?: { status?: "" | "active" | "history"; search?: string }) {
    const status = overrides?.status ?? statusFilter;
    const searchValue = overrides?.search ?? search;

    try {
      const [productRows, vehicleRows] = await Promise.all([
        listProductDiscountHistory({ status: status || undefined, search: searchValue || undefined }),
        listVehicleDiscountHistory({ status: status || undefined, search: searchValue || undefined }),
      ]);
      setRows([...productRows.map(fromProductRow), ...vehicleRows.map(fromVehicleRow)]);
      setLoaded(true);
    } catch (error) {
      const message = error instanceof ApiRequestError ? error.message : "სიის ჩატვირთვა ვერ მოხერხდა";
      toast.error(message);
    }
  }

  useEffect(() => {
    let cancelled = false;
    Promise.all([listProductDiscountHistory(), listVehicleDiscountHistory()])
      .then(([productRows, vehicleRows]) => {
        if (cancelled) return;
        setRows([...productRows.map(fromProductRow), ...vehicleRows.map(fromVehicleRow)]);
        setLoaded(true);
      })
      .catch(() => {
        if (!cancelled) toast.error("სიის ჩატვირთვა ვერ მოხერხდა");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const filteredRows = typeFilter ? rows.filter((row) => row.type === typeFilter) : rows;

  const columns: DataTableColumn<UnifiedRow>[] = [
    {
      header: "ტიპი",
      render: (row) => (
        <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold">{TYPE_LABELS[row.type]}</span>
      ),
    },
    { header: "პროდუქტი/ტექნიკა", render: (row) => row.label },
    { header: "დეტალები", render: (row) => row.subLabel, cellClassName: "text-muted-foreground" },
    {
      header: "ფასი",
      render: (row) => (
        <>
          <span className="text-muted-foreground line-through">{formatPrice(row.price)}</span>{" "}
          <span className="font-semibold">{formatPrice(row.discountPrice)}</span>
        </>
      ),
    },
    {
      header: "პროცენტი",
      render: (row) => (row.discountPercent != null ? `${row.discountPercent}%` : "—"),
      cellClassName: "text-muted-foreground",
    },
    {
      header: "პერიოდი",
      render: (row) => `${toTbilisiDateOnly(row.startDate)} – ${toTbilisiDateOnly(row.endDate)}`,
      cellClassName: "text-muted-foreground",
    },
    {
      header: "სტატუსი",
      render: (row) => (
        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_CLASSES[row.computedStatus]}`}>
          {STATUS_LABELS[row.computedStatus]}
        </span>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        ყველა არსებული ფასდაკლება — მასობრივად თუ ინდივიდუალურად დამატებული — ერთად, ფილტრებით.
        წასაშლელად (გასაუქმებლად) გამოიყენეთ ცხრილის მოქმედების ღილაკი, ან რედაქტირებისთვის გახსენით
        შესაბამისი პროდუქტი/განცხადება.
      </p>

      <div className="grid gap-3 sm:grid-cols-3">
        <input
          type="text"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          onBlur={() => refresh()}
          onKeyDown={(event) => {
            if (event.key === "Enter") refresh();
          }}
          placeholder="ძებნა სახელით (Enter)"
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
        />
        <Select
          options={[
            { value: "", label: "ყველა ტიპი" },
            { value: "PRODUCT", label: "პროდუქტი" },
            { value: "VEHICLE", label: "ტრანსპორტი" },
          ]}
          value={typeFilter}
          onChange={(value) => setTypeFilter(value as "" | "PRODUCT" | "VEHICLE")}
          placeholder="ტიპი"
          ariaLabel="ტიპის ფილტრი"
        />
        <Select
          options={[
            { value: "", label: "ყველა სტატუსი" },
            { value: "active", label: "აქტიური" },
            { value: "history", label: "ისტორია (დაგეგმილი/ვადაგასული)" },
          ]}
          value={statusFilter}
          onChange={(value) => {
            setStatusFilter(value as "" | "active" | "history");
            void refresh({ status: value as "" | "active" | "history" });
          }}
          placeholder="სტატუსი"
          ariaLabel="სტატუსის ფილტრი"
        />
      </div>

      {loaded && (
        <DataTable
          columns={columns}
          data={filteredRows}
          getRowKey={(row) => row.key}
          emptyMessage="ფასდაკლება არ არსებობს"
          actions={(row) => (
            <button
              type="button"
              onClick={() => setDeletingRow(row)}
              className="rounded-full px-3 py-1 text-xs font-semibold text-red-600 transition-colors hover:bg-red-500/10"
            >
              წაშლა
            </button>
          )}
        />
      )}

      <ConfirmDialog
        open={deletingRow !== null}
        onClose={() => setDeletingRow(null)}
        title="ფასდაკლების წაშლა"
        message={
          <>
            დარწმუნებული ხართ, რომ გსურთ წაშალოთ ფასდაკლება (
            <span className="font-semibold text-foreground">{deletingRow?.label}</span>)? ამ
            მოქმედების გაუქმება შეუძლებელია.
          </>
        }
        successMessage="ფასდაკლება წაიშალა"
        onConfirm={async () => {
          if (!deletingRow) return;
          if (deletingRow.type === "PRODUCT" && deletingRow.variantId != null) {
            await deleteProductVariantDiscount(deletingRow.variantId, deletingRow.discountId);
          } else if (deletingRow.type === "VEHICLE" && deletingRow.vehicleListingId != null) {
            await deleteVehicleListingDiscount(deletingRow.vehicleListingId, deletingRow.discountId);
          }
          await refresh();
        }}
      />
    </div>
  );
}
