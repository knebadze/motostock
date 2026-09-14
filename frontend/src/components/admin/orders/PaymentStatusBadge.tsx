import type { PaymentStatus } from "@/lib/api/orders";

// NOT_APPLICABLE renders nothing — COURIER/PICKUP orders and CARD orders
// placed before any gateway integration exists both land here, and neither
// is a state worth flagging in a table full of other orders. Same shape as
// FinaSyncBadge.tsx.
export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  if (status === "NOT_APPLICABLE") return null;

  if (status === "PAID") {
    return (
      <span className="rounded-full bg-green-500/15 px-2 py-0.5 text-xs font-semibold text-green-600">
        გადახდილია
      </span>
    );
  }

  if (status === "AWAITING_PAYMENT") {
    return (
      <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-semibold text-amber-600">
        გადახდის მოლოდინში
      </span>
    );
  }

  if (status === "REFUNDED") {
    return (
      <span className="rounded-full bg-slate-500/15 px-2 py-0.5 text-xs font-semibold text-slate-600">
        თანხა დაბრუნებულია
      </span>
    );
  }

  return (
    <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-xs font-semibold text-red-600">
      გადახდა ვერ შედგა
    </span>
  );
}
