import type { FinaSyncRun } from "@/lib/api/fina-sync";

// Shared by FinaSyncManager's full history table and the dashboard's
// recent-runs preview.
export const FINA_SYNC_TRIGGER_LABEL: Record<FinaSyncRun["trigger"], string> = {
  SCHEDULED: "ავტომატური",
  MANUAL: "ხელით",
  CHECKOUT: "შეკვეთისას",
};

const FINA_SYNC_STATUS_STYLE: Record<FinaSyncRun["status"], string> = {
  SUCCESS: "bg-primary/15 text-primary",
  PARTIAL: "bg-amber-500/15 text-amber-600",
  FAILED: "bg-red-500/15 text-red-600",
};

const FINA_SYNC_STATUS_LABEL: Record<FinaSyncRun["status"], string> = {
  SUCCESS: "წარმატებული",
  PARTIAL: "ნაწილობრივი",
  FAILED: "წარუმატებელი",
};

export function FinaSyncStatusBadge({ status }: { status: FinaSyncRun["status"] }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${FINA_SYNC_STATUS_STYLE[status]}`}>
      {FINA_SYNC_STATUS_LABEL[status]}
    </span>
  );
}
