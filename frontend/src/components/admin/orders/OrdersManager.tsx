"use client";

import { useState } from "react";
import { toast } from "sonner";
import { DataTable, type DataTableColumn } from "@/components/shared/DataTable";
import { Pagination, useServerPagination, type PagedResult } from "@/components/shared/Pagination";
import { Select } from "@/components/shared/Select";
import { formatDate, formatDateTime, formatPrice, toTbilisiDateOnly } from "@/lib/format";
import { ApiRequestError } from "@/lib/api/client";
import {
  listAllOrders,
  type AdminOrderSummary,
  type AdminOrdersPage,
  type ListOrdersFilters,
  type OrderFulfillmentMethod,
} from "@/lib/api/orders";
import type { LookupItem } from "@/lib/api/lookups";
import { OrderDetailModal } from "./OrderDetailModal";
import { OrderStatusBadge } from "./OrderStatusBadge";
import { FinaSyncBadge } from "./FinaSyncBadge";

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

  // Compares Tbilisi calendar-day strings, not `new Date(y, m, d)` (which
  // reads the runtime's own local timezone — UTC on this app's server,
  // Tbilisi in a real admin's browser) — this table's `initialData` is a
  // server-fetched prop, so this function's first run is server-side; a
  // local-getter comparison would disagree with the client's post-hydration
  // re-run for part of every day (whenever it's already tomorrow in Tbilisi
  // but still today in UTC), flashing the wrong badge color before React's
  // hydration correction kicks in.
  const todayKey = toTbilisiDateOnly(now.toISOString());
  const estimatedDayKey = toTbilisiDateOnly(order.estimatedDeliveryDate);
  if (todayKey >= estimatedDayKey) return "red";

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
  { header: "FINA", render: (order) => <FinaSyncBadge status={order.finaSyncStatus} /> },
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
  initialData,
  statuses,
}: {
  initialData: AdminOrdersPage;
  statuses: LookupItem[];
}) {
  const { data, totalPages, loading, load } = useServerPagination<AdminOrderSummary>({
    items: initialData.orders,
    total: initialData.total,
    page: initialData.page,
    pageSize: initialData.pageSize,
  });
  const [search, setSearch] = useState("");
  const [statusIds, setStatusIds] = useState<string[]>([]);
  const [fulfillmentMethods, setFulfillmentMethods] = useState<string[]>([]);
  const [createdFrom, setCreatedFrom] = useState("");
  const [createdTo, setCreatedTo] = useState("");
  const [flaggedOnly, setFlaggedOnly] = useState(false);
  const [viewingOrderId, setViewingOrderId] = useState<number | null>(null);

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

  // Real server-side pagination — every filter change (via handleApplyFilters/
  // handleClearFilters below) resets to page 1, while loadPage re-fetches the
  // same filters under a different page. listAllOrders' {orders,...} envelope
  // is remapped into useServerPagination's {items,...} shape here — the API
  // response shape itself is unchanged.
  async function fetchOrdersPage(
    filters: ListOrdersFilters,
    page: number,
  ): Promise<PagedResult<AdminOrderSummary>> {
    const result = await listAllOrders({ ...filters, page, pageSize: data.pageSize });
    return { items: result.orders, total: result.total, page: result.page, pageSize: result.pageSize };
  }

  function onLoadError(error: unknown) {
    toast.error(error instanceof ApiRequestError ? error.message : "შეკვეთების ჩატვირთვა ვერ მოხერხდა");
  }

  function handleApplyFilters() {
    load(() => fetchOrdersPage(currentFilters(), 1), onLoadError);
  }

  function handleClearFilters() {
    setSearch("");
    setStatusIds([]);
    setFulfillmentMethods([]);
    setCreatedFrom("");
    setCreatedTo("");
    setFlaggedOnly(false);
    load(() => fetchOrdersPage({}, 1), onLoadError);
  }

  function loadPage(page: number) {
    load(() => fetchOrdersPage(currentFilters(), page), onLoadError);
  }

  // Re-reads the list under the same filters and page after a status edit
  // inside the modal, without resetting pagination the way fetchOrdersPage's
  // callers above do — the admin is still looking at the same page, just
  // with one row's badge possibly now stale.
  function handleOrderStatusChanged() {
    load(
      () => fetchOrdersPage(currentFilters(), data.page),
      (error) => toast.error(error instanceof ApiRequestError ? error.message : "სიის განახლება ვერ მოხერხდა"),
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">შეკვეთები</h1>
      <p className="mt-1 text-sm text-muted-foreground">სულ {data.total}.</p>

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
          <label htmlFor="orders-filter-status" className="text-xs font-medium text-muted-foreground">
            სტატუსი
          </label>
          <Select
            id="orders-filter-status"
            multiple
            options={statusOptions}
            value={statusIds}
            onChange={setStatusIds}
            placeholder="ყველა"
          />
        </div>
        <div className="flex w-48 flex-col gap-1.5">
          <label htmlFor="orders-filter-fulfillment" className="text-xs font-medium text-muted-foreground">
            მიწოდება
          </label>
          <Select
            id="orders-filter-fulfillment"
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
          data={data.items}
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
        <Pagination currentPage={data.page} totalPages={totalPages} onPageChange={loadPage} />
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
