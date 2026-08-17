import type { AnalyticsCancellationReasonCount } from "@/lib/api/analytics";

// Same technique as OrderStatusChart (see that file) — plain Tailwind bars,
// no charting library. Reasons are admin-defined (not a closed enum like
// OrderStatus), so there's no fixed per-key color map here — every bar uses
// the same accent, identity is carried by the label, not the color.
export function CancellationReasonChart({ data }: { data: AnalyticsCancellationReasonCount[] }) {
  const max = Math.max(1, ...data.map((row) => row.count));

  return (
    <div className="flex h-full flex-col gap-3 rounded-2xl border border-border bg-card p-6">
      {data.length === 0 ? (
        <p className="text-sm text-muted-foreground">გაუქმებული შეკვეთა არ არის</p>
      ) : (
        data.map((row) => (
          <div key={row.reason?.id ?? "unspecified"} className="flex items-center gap-3">
            <span className="w-32 shrink-0 truncate text-xs text-muted-foreground">
              {row.reason?.nameKa ?? "მიზეზი მითითებული არ არის"}
            </span>
            <div className="h-3 flex-1 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${(row.count / max) * 100}%` }}
              />
            </div>
            <span className="w-6 shrink-0 text-right text-xs font-semibold tabular-nums text-foreground">
              {row.count}
            </span>
          </div>
        ))
      )}
    </div>
  );
}
