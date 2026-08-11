"use client";

import { DataTable, type DataTableColumn } from "@/components/shared/DataTable";
import { formatDateTime } from "@/lib/format";
import { FINA_SYNC_TRIGGER_LABEL, FinaSyncStatusBadge } from "@/components/admin/fina-sync/FinaSyncStatusBadge";
import type { FinaSyncRun } from "@/lib/api/fina-sync";

const columns: DataTableColumn<FinaSyncRun>[] = [
  { header: "დრო", render: (run) => formatDateTime(run.startedAt) },
  { header: "ტიპი", render: (run) => FINA_SYNC_TRIGGER_LABEL[run.trigger] },
  { header: "სტატუსი", render: (run) => <FinaSyncStatusBadge status={run.status} /> },
  { header: "ვარიანტები", render: (run) => `${run.variantsUpdated} / ${run.variantsChecked}` },
  {
    header: "შეცდომა",
    render: (run) => run.errorMessage ?? "—",
    cellClassName: "text-muted-foreground",
  },
];

export function FinaSyncRunsTable({ runs }: { runs: FinaSyncRun[] }) {
  return (
    <DataTable
      columns={columns}
      data={runs}
      getRowKey={(run) => run.id}
      emptyMessage="სინქრონიზაცია ჯერ არ განხორციელებულა"
    />
  );
}
