import type { FinaOrderSyncStatus } from "@/lib/api/orders";

// NOT_APPLICABLE renders nothing — most orders have no FINA-linked items (or
// FINA isn't configured at all yet), and that's not a state worth flagging
// in a table full of other orders.
export function FinaSyncBadge({ status }: { status: FinaOrderSyncStatus }) {
  if (status === "NOT_APPLICABLE") return null;

  if (status === "SYNCED") {
    return (
      <span className="rounded-full bg-green-500/15 px-2 py-0.5 text-xs font-semibold text-green-600">
        FINA ✓
      </span>
    );
  }

  return (
    <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-xs font-semibold text-red-600">
      FINA ვერ დასინქრონდა
    </span>
  );
}
