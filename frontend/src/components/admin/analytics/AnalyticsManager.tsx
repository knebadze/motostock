"use client";

import { useState } from "react";
import { toast } from "sonner";
import { DataTable } from "@/components/shared/DataTable";
import { ApiRequestError } from "@/lib/api/client";
import { getAnalytics, type AnalyticsOverview } from "@/lib/api/analytics";
import { formatDate, formatDateTime, formatPrice } from "@/lib/format";
import { OrderStatusChart } from "@/components/admin/dashboard/OrderStatusChart";
import { RevenueTrendChart } from "./RevenueTrendChart";
import { CancellationReasonChart } from "./CancellationReasonChart";

export function AnalyticsManager({ initialData }: { initialData: AnalyticsOverview }) {
  const [data, setData] = useState(initialData);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [loading, setLoading] = useState(false);

  async function fetchData(filters: { dateFrom?: string; dateTo?: string }) {
    setLoading(true);
    try {
      setData(await getAnalytics(filters));
    } catch (error) {
      toast.error(error instanceof ApiRequestError ? error.message : "ანალიტიკის ჩატვირთვა ვერ მოხერხდა");
    } finally {
      setLoading(false);
    }
  }

  function handleApplyFilters() {
    fetchData({ dateFrom: dateFrom || undefined, dateTo: dateTo || undefined });
  }

  function handleClearFilters() {
    setDateFrom("");
    setDateTo("");
    fetchData({});
  }

  const statCards = [
    { label: "შემოსავალი", value: formatPrice(data.financial.revenue) },
    { label: "შეკვეთები", value: String(data.financial.orderCount) },
    { label: "გაუქმებული", value: String(data.financial.cancelledCount) },
    { label: "დაკარგული შემოსავალი", value: formatPrice(data.financial.lostRevenue) },
    { label: "გაუქმების %", value: `${(data.financial.cancellationRate * 100).toFixed(1)}%` },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">ანალიტიკა</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {formatDate(data.range.from)} – {formatDate(data.range.to)}
      </p>

      <div className="mt-6 flex flex-wrap items-end gap-3 rounded-2xl border border-border bg-card p-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-muted-foreground">თარიღი (დან)</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(event) => setDateFrom(event.target.value)}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-muted-foreground">თარიღი (მდე)</label>
          <input
            type="date"
            value={dateTo}
            onChange={(event) => setDateTo(event.target.value)}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          />
        </div>
        <button
          type="button"
          onClick={handleApplyFilters}
          disabled={loading}
          className="rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
        >
          გამოყენება
        </button>
        <button
          type="button"
          onClick={handleClearFilters}
          disabled={loading}
          className="rounded-full border border-border px-4 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
        >
          გასუფთავება (30 დღე)
        </button>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {statCards.map((stat) => (
          <div key={stat.label} className="rounded-2xl border border-border bg-card p-6">
            <p className="text-sm text-muted-foreground">{stat.label}</p>
            <p className="mt-2 text-2xl font-bold tabular-nums tracking-tight">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          შემოსავალი დროში
        </h2>
        <RevenueTrendChart data={data.revenueSeries} />
      </div>

      <div className="mt-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          მოთხოვნადი პროდუქტები
        </h2>
        <DataTable
          columns={[
            { header: "პროდუქტი", render: (row) => row.nameKa },
            { header: "ნახვები", headerClassName: "text-right", cellClassName: "text-right tabular-nums", render: (row) => row.viewCount },
            { header: "ვიშლისტი", headerClassName: "text-right", cellClassName: "text-right tabular-nums", render: (row) => row.wishlistCount },
            { header: "კალათა", headerClassName: "text-right", cellClassName: "text-right tabular-nums", render: (row) => row.cartCount },
            { header: "გაყიდული", headerClassName: "text-right", cellClassName: "text-right tabular-nums", render: (row) => row.quantitySold },
            { header: "შემოსავალი", headerClassName: "text-right", cellClassName: "text-right tabular-nums", render: (row) => formatPrice(row.revenue) },
          ]}
          data={data.topProducts}
          getRowKey={(row) => row.id}
          emptyMessage="მონაცემი არ არის"
        />
      </div>

      <div className="mt-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          მოთხოვნადი ტექნიკა
        </h2>
        <DataTable
          columns={[
            { header: "ტექნიკა", render: (row) => row.label },
            { header: "ნახვები", headerClassName: "text-right", cellClassName: "text-right tabular-nums", render: (row) => row.viewCount },
            { header: "ვიშლისტი", headerClassName: "text-right", cellClassName: "text-right tabular-nums", render: (row) => row.wishlistCount },
            { header: "კალათა", headerClassName: "text-right", cellClassName: "text-right tabular-nums", render: (row) => row.cartCount },
            { header: "გაყიდული", headerClassName: "text-right", cellClassName: "text-right tabular-nums", render: (row) => row.quantitySold },
            { header: "შემოსავალი", headerClassName: "text-right", cellClassName: "text-right tabular-nums", render: (row) => formatPrice(row.revenue) },
          ]}
          data={data.topVehicleListings}
          getRowKey={(row) => row.id}
          emptyMessage="მონაცემი არ არის"
        />
      </div>

      <div className="mt-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          შეკვეთები სტატუსების მიხედვით
        </h2>
        <OrderStatusChart data={data.ordersByStatus} />
      </div>

      <div className="mt-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          გაუქმების მიზეზები
        </h2>
        <CancellationReasonChart data={data.cancellations.reasonBreakdown} />
      </div>

      <div className="mt-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          ბოლო გაუქმებული შეკვეთები
        </h2>
        <DataTable
          columns={[
            { header: "შეკვეთა", render: (row) => row.orderCode },
            { header: "მყიდველი", render: (row) => `${row.buyerName} · ${row.buyerEmail}` },
            { header: "ჯამი", headerClassName: "text-right", cellClassName: "text-right tabular-nums", render: (row) => formatPrice(row.total) },
            { header: "მიზეზი", render: (row) => row.reason?.nameKa ?? "მითითებული არ არის" },
            { header: "შენიშვნა", render: (row) => row.note ?? "—" },
            { header: "გაუქმების თარიღი", render: (row) => formatDateTime(row.cancelledAt) },
          ]}
          data={data.cancellations.recentOrders}
          getRowKey={(row) => row.id}
          emptyMessage="გაუქმებული შეკვეთა არ არის"
        />
      </div>
    </div>
  );
}
