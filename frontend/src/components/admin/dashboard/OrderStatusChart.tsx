import type { DashboardStats } from "@/lib/api/dashboard";

// Same status→color convention as OrderStatusBadge (see that file) — a
// stronger solid fill here since these are chart bars, not text badges.
const STATUS_BAR_CLASSES: Record<string, string> = {
  PENDING: "bg-gray-400",
  CONFIRMED: "bg-blue-500",
  SHIPPED: "bg-amber-500",
  DELIVERED: "bg-green-500",
  CANCELLED: "bg-red-500",
};

export function OrderStatusChart({ data }: { data: DashboardStats["ordersByStatus"] }) {
  const max = Math.max(1, ...data.map((row) => row.count));

  return (
    <div className="flex h-full flex-col gap-3 rounded-2xl border border-border bg-card p-6">
      {data.length === 0 ? (
        <p className="text-sm text-muted-foreground">მონაცემი არ არის</p>
      ) : (
        data.map((row) => (
          <div key={row.status.id} className="flex items-center gap-3">
            <span className="w-24 shrink-0 truncate text-xs text-muted-foreground">{row.status.nameKa}</span>
            <div className="h-3 flex-1 overflow-hidden rounded-full bg-muted">
              <div
                className={`h-full rounded-full ${STATUS_BAR_CLASSES[row.status.key] ?? "bg-gray-400"}`}
                style={{ width: `${(row.count / max) * 100}%` }}
              />
            </div>
            <span className="w-6 shrink-0 text-right text-xs font-semibold text-foreground">{row.count}</span>
          </div>
        ))
      )}
    </div>
  );
}
