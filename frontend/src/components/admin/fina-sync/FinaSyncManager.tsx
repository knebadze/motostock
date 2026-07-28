"use client";

import { useState } from "react";
import { toast } from "sonner";
import { DataTable, type DataTableColumn } from "@/components/shared/DataTable";
import { getFinaSyncRuns, triggerFinaSync, type FinaSyncRun } from "@/lib/api/fina-sync";
import { ApiRequestError } from "@/lib/api/client";
import { formatDateTime } from "@/lib/format";

const TRIGGER_LABEL: Record<FinaSyncRun["trigger"], string> = {
  SCHEDULED: "ავტომატური",
  MANUAL: "ხელით",
};

const STATUS_STYLE: Record<FinaSyncRun["status"], string> = {
  SUCCESS: "bg-primary/15 text-primary",
  PARTIAL: "bg-amber-500/15 text-amber-600",
  FAILED: "bg-red-500/15 text-red-600",
};

const STATUS_LABEL: Record<FinaSyncRun["status"], string> = {
  SUCCESS: "წარმატებული",
  PARTIAL: "ნაწილობრივი",
  FAILED: "წარუმატებელი",
};

export function FinaSyncManager({ initialRuns }: { initialRuns: FinaSyncRun[] }) {
  const [runs, setRuns] = useState(initialRuns);
  const [syncing, setSyncing] = useState(false);

  async function handleSyncNow() {
    setSyncing(true);
    try {
      await triggerFinaSync();
      const updated = await getFinaSyncRuns();
      setRuns(updated);
      toast.success("სინქრონიზაცია დასრულდა");
    } catch (error) {
      const message =
        error instanceof ApiRequestError ? error.message : "სინქრონიზაცია ვერ მოხერხდა";
      toast.error(message);
      try {
        setRuns(await getFinaSyncRuns());
      } catch {
        // history refresh is best-effort; the toast above already reported the failure
      }
    } finally {
      setSyncing(false);
    }
  }

  const columns: DataTableColumn<FinaSyncRun>[] = [
    { header: "დრო", render: (run) => formatDateTime(run.startedAt) },
    { header: "ტიპი", render: (run) => TRIGGER_LABEL[run.trigger] },
    {
      header: "სტატუსი",
      render: (run) => (
        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_STYLE[run.status]}`}>
          {STATUS_LABEL[run.status]}
        </span>
      ),
    },
    {
      header: "ვარიანტები",
      render: (run) => `${run.variantsUpdated} / ${run.variantsChecked}`,
    },
    {
      header: "გამშვები",
      render: (run) => (run.trigger === "MANUAL" ? (run.triggeredBy?.name ?? "—") : "—"),
    },
    {
      header: "შეცდომა",
      render: (run) => run.errorMessage ?? "—",
      cellClassName: "text-muted-foreground",
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">FINA სინქრონიზაცია</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            მარაგის ავტომატური და ხელით სინქრონიზაცია FINA-დან. დაკავშირება ხდება ვარიანტის
            რედაქტირებისას, &quot;FINA ID&quot; ველით.
          </p>
        </div>
        <button
          type="button"
          onClick={handleSyncNow}
          disabled={syncing}
          className="shrink-0 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover disabled:opacity-50"
        >
          {syncing ? "სინქრონიზაცია..." : "სინქრონიზაცია ახლავე"}
        </button>
      </div>

      <div className="mt-6">
        <DataTable
          columns={columns}
          data={runs}
          getRowKey={(run) => run.id}
          emptyMessage="სინქრონიზაცია ჯერ არ განხორციელებულა"
        />
      </div>
    </div>
  );
}
