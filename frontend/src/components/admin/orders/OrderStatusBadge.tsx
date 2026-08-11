import type { LookupItem } from "@/lib/api/lookups";

// Status keys come from the seeded "order-statuses" lookup (see
// prisma/seed.ts's ORDER_STATUSES) — falls back to a neutral badge for any
// status an admin later renames/adds via General Classifiers. Shared by
// OrdersManager's table and the dashboard's recent-orders preview.
export const ORDER_STATUS_BADGE_CLASSES: Record<string, string> = {
  PENDING: "bg-muted text-muted-foreground",
  CONFIRMED: "bg-blue-500/15 text-blue-600",
  SHIPPED: "bg-amber-500/15 text-amber-600",
  DELIVERED: "bg-green-500/15 text-green-600",
  CANCELLED: "bg-red-500/15 text-red-600",
};

export function OrderStatusBadge({ status }: { status: Pick<LookupItem, "key" | "nameKa"> }) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
        ORDER_STATUS_BADGE_CLASSES[status.key] ?? "bg-muted text-muted-foreground"
      }`}
    >
      {status.nameKa}
    </span>
  );
}
