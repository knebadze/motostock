import Link from "next/link";
import { getDashboardStatsFromServer, getFinaSyncRunsFromServer } from "@/lib/api/server";
import { formatPrice } from "@/lib/format";
import { OrderStatusChart } from "@/components/admin/dashboard/OrderStatusChart";
import { RecentOrdersTable } from "@/components/admin/dashboard/RecentOrdersTable";
import { LowStockTable } from "@/components/admin/dashboard/LowStockTable";
import { FinaSyncRunsTable } from "@/components/admin/dashboard/FinaSyncRunsTable";

const RECENT_FINA_SYNC_RUNS_LIMIT = 6;

export default async function DashboardPage() {
  const [stats, finaSyncRuns] = await Promise.all([
    getDashboardStatsFromServer(),
    getFinaSyncRunsFromServer(),
  ]);

  const statCards = [
    { label: "სულ შეკვეთები", value: String(stats.counts.totalOrders) },
    { label: "შემოსავალი (30 დღე)", value: formatPrice(stats.revenueLast30Days) },
    {
      label: "დაბალი მარაგი",
      value: String(stats.counts.lowStockCount),
      valueClassName: stats.counts.lowStockCount > 0 ? "text-amber-600" : "",
    },
    { label: "მომხმარებლები", value: String(stats.counts.totalUsers) },
    { label: "პროდუქტები", value: String(stats.counts.totalProducts) },
    { label: "გასაყიდი ტექნიკა", value: String(stats.counts.totalVehicleListings) },
    { label: "აქტიური პრომოკოდები", value: String(stats.counts.activePromoCodes) },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">დეშბორდი</h1>
      <p className="mt-2 text-muted-foreground">მოგესალმებით მოტოსტოკის ადმინ პანელში.</p>

      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {statCards.map((stat) => (
          <div key={stat.label} className="rounded-2xl border border-border bg-card p-6">
            <p className="text-sm text-muted-foreground">{stat.label}</p>
            <p className={`mt-2 text-3xl font-bold tracking-tight ${stat.valueClassName}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            ბოლო შეკვეთები
          </h2>
          <RecentOrdersTable orders={stats.recentOrders} />
        </div>
        <div>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            შეკვეთები სტატუსების მიხედვით
          </h2>
          <OrderStatusChart data={stats.ordersByStatus} />
        </div>
      </div>

      <div className="mt-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          საჭიროებს ყურადღებას — დაბალი მარაგი
        </h2>
        <LowStockTable items={stats.lowStockItems} />
      </div>

      <div className="mt-8">
        <div className="mb-3 flex items-center justify-between gap-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            FINA სინქრონიზაცია — ბოლო გაშვებები
          </h2>
          <Link href="/admin/fina-sync" className="text-sm font-medium text-primary hover:underline">
            ყველას ნახვა
          </Link>
        </div>
        <FinaSyncRunsTable runs={finaSyncRuns.slice(0, RECENT_FINA_SYNC_RUNS_LIMIT)} />
      </div>
    </div>
  );
}
