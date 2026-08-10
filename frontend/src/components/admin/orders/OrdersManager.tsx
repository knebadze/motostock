"use client";

import { useState } from "react";
import { toast } from "sonner";
import { DataTable, type DataTableColumn } from "@/components/shared/DataTable";
import { Pagination, usePagination } from "@/components/shared/Pagination";
import { Select } from "@/components/shared/Select";
import { formatDateTime, formatPrice } from "@/lib/format";
import { ApiRequestError } from "@/lib/api/client";
import {
  listAllOrders,
  type AdminOrderSummary,
  type ListOrdersFilters,
  type OrderFulfillmentMethod,
} from "@/lib/api/orders";
import type { LookupItem } from "@/lib/api/lookups";
import { OrderDetailModal } from "./OrderDetailModal";

const FULFILLMENT_LABELS: Record<OrderFulfillmentMethod, string> = {
  CARD: "ბარათით გადახდა",
  COURIER: "კურიერთან გადახდა",
  PICKUP: "ადგილიდან გატანა",
};

const FULFILLMENT_OPTIONS = (Object.keys(FULFILLMENT_LABELS) as OrderFulfillmentMethod[]).map(
  (value) => ({ value, label: FULFILLMENT_LABELS[value] }),
);

// Status keys come from the seeded "order-statuses" lookup (see
// prisma/seed.ts's ORDER_STATUSES) — falls back to a neutral badge for any
// status an admin later renames/adds via General Classifiers.
const STATUS_BADGE_CLASSES: Record<string, string> = {
  PENDING: "bg-muted text-muted-foreground",
  CONFIRMED: "bg-blue-500/15 text-blue-600",
  SHIPPED: "bg-amber-500/15 text-amber-600",
  DELIVERED: "bg-green-500/15 text-green-600",
  CANCELLED: "bg-red-500/15 text-red-600",
};

function statusBadge(status: AdminOrderSummary["status"]) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
        STATUS_BADGE_CLASSES[status.key] ?? "bg-muted text-muted-foreground"
      }`}
    >
      {status.nameKa}
    </span>
  );
}

const columns: DataTableColumn<AdminOrderSummary>[] = [
  { header: "კოდი", render: (order) => order.orderCode },
  {
    header: "მყიდველი",
    render: (order) => (
      <div>
        <p>
          {order.buyer.firstName} {order.buyer.lastName}
        </p>
        <p className="text-xs text-muted-foreground">{order.buyer.email}</p>
      </div>
    ),
  },
  { header: "სტატუსი", render: (order) => statusBadge(order.status) },
  { header: "მიწოდება", render: (order) => FULFILLMENT_LABELS[order.fulfillmentMethod] },
  {
    header: "თანხა",
    render: (order) => formatPrice(order.total),
    cellClassName: "font-semibold text-primary",
  },
  {
    header: "თარიღი",
    render: (order) => formatDateTime(order.createdAt),
    cellClassName: "text-muted-foreground",
  },
];

export function OrdersManager({
  initialOrders,
  statuses,
}: {
  initialOrders: AdminOrderSummary[];
  statuses: LookupItem[];
}) {
  const [orders, setOrders] = useState(initialOrders);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [statusIds, setStatusIds] = useState<string[]>([]);
  const [fulfillmentMethods, setFulfillmentMethods] = useState<string[]>([]);
  const [createdFrom, setCreatedFrom] = useState("");
  const [createdTo, setCreatedTo] = useState("");
  const [viewingOrderId, setViewingOrderId] = useState<number | null>(null);
  const { page, setPage, pageItems, totalPages } = usePagination(orders);

  const statusOptions = statuses.map((status) => ({ value: String(status.id), label: status.nameKa }));
  const hasActiveFilters =
    search.trim() !== "" ||
    statusIds.length > 0 ||
    fulfillmentMethods.length > 0 ||
    createdFrom !== "" ||
    createdTo !== "";

  function currentFilters(): ListOrdersFilters {
    return {
      search: search.trim() || undefined,
      statusIds: statusIds.length > 0 ? statusIds.map(Number) : undefined,
      fulfillmentMethods:
        fulfillmentMethods.length > 0 ? (fulfillmentMethods as OrderFulfillmentMethod[]) : undefined,
      createdFrom: createdFrom || undefined,
      createdTo: createdTo || undefined,
    };
  }

  async function fetchOrders(filters: ListOrdersFilters) {
    setLoading(true);
    try {
      setOrders(await listAllOrders(filters));
      setPage(1);
    } catch (error) {
      toast.error(error instanceof ApiRequestError ? error.message : "შეკვეთების ჩატვირთვა ვერ მოხერხდა");
    } finally {
      setLoading(false);
    }
  }

  function handleApplyFilters() {
    fetchOrders(currentFilters());
  }

  function handleClearFilters() {
    setSearch("");
    setStatusIds([]);
    setFulfillmentMethods([]);
    setCreatedFrom("");
    setCreatedTo("");
    fetchOrders({});
  }

  // Re-reads the list under the same filters after a status edit inside the
  // modal, without resetting pagination the way fetchOrders does — the
  // admin is still looking at the same page, just with one row's badge
  // possibly now stale.
  async function handleOrderStatusChanged() {
    try {
      setOrders(await listAllOrders(currentFilters()));
    } catch (error) {
      toast.error(error instanceof ApiRequestError ? error.message : "სიის განახლება ვერ მოხერხდა");
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">შეკვეთები</h1>
      <p className="mt-1 text-sm text-muted-foreground">სულ {orders.length}.</p>

      <div className="mt-6 flex flex-wrap items-end gap-3 rounded-2xl border border-border bg-card p-4">
        <div className="flex min-w-48 flex-1 flex-col gap-1.5">
          <label className="text-xs font-medium text-muted-foreground">ძებნა</label>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="კოდი, სახელი ან ელფოსტა"
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          />
        </div>
        <div className="flex w-48 flex-col gap-1.5">
          <label className="text-xs font-medium text-muted-foreground">სტატუსი</label>
          <Select multiple options={statusOptions} value={statusIds} onChange={setStatusIds} placeholder="ყველა" />
        </div>
        <div className="flex w-48 flex-col gap-1.5">
          <label className="text-xs font-medium text-muted-foreground">მიწოდება</label>
          <Select
            multiple
            options={FULFILLMENT_OPTIONS}
            value={fulfillmentMethods}
            onChange={setFulfillmentMethods}
            placeholder="ყველა"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-muted-foreground">თარიღი (დან)</label>
          <input
            type="date"
            value={createdFrom}
            onChange={(event) => setCreatedFrom(event.target.value)}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-muted-foreground">თარიღი (მდე)</label>
          <input
            type="date"
            value={createdTo}
            onChange={(event) => setCreatedTo(event.target.value)}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
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
          getRowKey={(order) => order.id}
          emptyMessage="შეკვეთა არ მოიძებნა"
          actions={(order) => (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setViewingOrderId(order.id)}
                aria-label="სრულად ნახვა"
                title="სრულად ნახვა"
                className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-primary"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="size-4"
                >
                  <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              </button>
            </div>
          )}
        />
        <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
      </div>

      {viewingOrderId != null && (
        <OrderDetailModal
          orderId={viewingOrderId}
          statuses={statuses}
          onClose={() => setViewingOrderId(null)}
          onStatusChanged={handleOrderStatusChanged}
        />
      )}
    </div>
  );
}
