import type { ScheduledJobRun } from "@/lib/api/scheduled-jobs";

// Same visual pattern as fina-sync/FinaSyncStatusBadge.tsx — one status enum
// smaller (no PARTIAL, these jobs are always all-or-nothing).
const STATUS_STYLE: Record<ScheduledJobRun["status"], string> = {
  RUNNING: "bg-blue-500/15 text-blue-600",
  SUCCESS: "bg-primary/15 text-primary",
  FAILED: "bg-red-500/15 text-red-600",
};

const STATUS_LABEL: Record<ScheduledJobRun["status"], string> = {
  RUNNING: "მიმდინარეობს",
  SUCCESS: "წარმატებული",
  FAILED: "წარუმატებელი",
};

export const SCHEDULED_JOB_TRIGGER_LABEL: Record<ScheduledJobRun["trigger"], string> = {
  SCHEDULED: "ავტომატური",
  MANUAL: "ხელით",
};

export function ScheduledJobStatusBadge({ status }: { status: ScheduledJobRun["status"] }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_STYLE[status]}`}>
      {STATUS_LABEL[status]}
    </span>
  );
}
