"use client";

import { useState } from "react";
import { toast } from "sonner";
import { DataTable, type DataTableColumn } from "@/components/shared/DataTable";
import { Pagination, usePagination } from "@/components/shared/Pagination";
import { Select } from "@/components/shared/Select";
import { formatDate, formatDateTime, formatPrice } from "@/lib/format";
import { ApiRequestError } from "@/lib/api/client";
import {
  listAllOrders,
  type AdminOrderSummary,
  type ListOrdersFilters,
  type OrderFulfillmentMethod,
} from "@/lib/api/orders";
import type { LookupItem } from "@/lib/api/lookups";
import { OrderDetailModal } from "./OrderDetailModal";
import { OrderStatusBadge } from "./OrderStatusBadge";

const FULFILLMENT_LABELS: Record<OrderFulfillmentMethod, string> = {
  CARD: "ბარათით გადახდა",
  COURIER: "კურიერთან გადახდა",
  PICKUP: "ადგილიდან გატანა",
};

const FULFILLMENT_OPTIONS = (Object.keys(FULFILLMENT_LABELS) as OrderFulfillmentMethod[]).map(
  (value) => ({ value, label: FULFILLMENT_LABELS[value] }),
);

const DELIVERY_URGENCY_CLASSES: Record<"green" | "yellow" | "red", string> = {
  green: "bg-green-500/15 text-green-600",
  yellow: "bg-amber-500/15 text-amber-600",
  red: "bg-red-500/15 text-red-600",
};

// Terminal statuses stop counting down — a delivered/cancelled order isn't
// "overdue" anymore, it's just done. Evaluated against the current moment
// at render time (not baked into the API response), same as every other
// formatted cell in this table.
function getDeliveryUrgency(order: AdminOrderSummary): "green" | "yellow" | "red" | null {
  if (!order.estimatedDeliveryDate) return null;
  if (order.status.key === "DELIVERED" || order.status.key === "CANCELLED") return null;

  const now = new Date();
  const estimated = new Date(order.estimatedDeliveryDate);

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const estimatedDay = new Date(estimated.getFullYear(), estimated.getMonth(), estimated.getDate());
  if (today >= estimatedDay) return "red";

  const created = new Date(order.createdAt);
  const totalWindowMs = estimated.getTime() - created.getTime();
  if (totalWindowMs <= 0) return "red";

  const elapsedMs = now.getTime() - created.getTime();
  return elapsedMs >= totalWindowMs / 2 ? "yellow" : "green";
}

function RiskFlagIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-4 shrink-0 text-amber-500"
      aria-label="საეჭვო შეკვეთა"
    >
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

const columns: DataTableColumn<AdminOrderSummary>[] = [
  {
    header: "კოდი",
    render: (order) => (
      <div className="flex items-center gap-1.5">
        {order.hasRiskFlags && <RiskFlagIcon />}
        <span>{order.orderCode}</span>
      </div>
    ),
  },
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
  { header: "სტატუსი", render: (order) => <OrderStatusBadge status={order.status} /> },
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
  {
    header: "მიწოდების მაქს. თარიღი",
    render: (order) => {
      if (!order.estimatedDeliveryDate) {
        return <span className="text-muted-foreground">—</span>;
      }
      const urgency = getDeliveryUrgency(order);
      const label = formatDate(order.estimatedDeliveryDate);
      if (!urgency) {
        return <span className="text-muted-foreground">{label}</span>;
      }
      return (
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-semibold ${DELIVERY_URGENCY_CLASSES[urgency]}`}
        >
          {label}
        </span>
      );
    },
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
  const [flaggedOnly, setFlaggedOnly] = useState(false);
  const [viewingOrderId, setViewingOrderId] = useState<number | null>(null);
  const { page, setPage, pageItems, totalPages } = usePagination(orders);

  const statusOptions = statuses.map((status) => ({ value: String(status.id), label: status.nameKa }));
  const hasActiveFilters =
    search.trim() !== "" ||
    statusIds.length > 0 ||
    fulfillmentMethods.length > 0 ||
    createdFrom !== "" ||
    createdTo !== "" ||
    flaggedOnly;

  function currentFilters(): ListOrdersFilters {
    return {
      search: search.trim() || undefined,
      statusIds: statusIds.length > 0 ? statusIds.map(Number) : undefined,
      fulfillmentMethods:
        fulfillmentMethods.length > 0 ? (fulfillmentMethods as OrderFulfillmentMethod[]) : undefined,
      createdFrom: createdFrom || undefined,
      createdTo: createdTo || undefined,
      flaggedOnly: flaggedOnly || undefined,
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
    setFlaggedOnly(false);
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
        <label className="flex items-center gap-2 pb-2 text-sm font-medium text-foreground">
          <input
            type="checkbox"
            checked={flaggedOnly}
            onChange={(event) => setFlaggedOnly(event.target.checked)}
            className="size-4 accent-primary"
          />
          მხოლოდ დროშიანი (რისკის სიგნალი)
        </label>
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
