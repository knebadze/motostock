"use client";

import { useState } from "react";
import { toast } from "sonner";
import { DataTable, type DataTableColumn } from "@/components/shared/DataTable";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { Modal } from "@/components/shared/Modal";
import { Pagination } from "@/components/shared/Pagination";
import { Loader } from "@/components/shared/Loader";
import { getErrorLogs, clearErrorLogs, type ErrorLog, type ErrorLogsPage } from "@/lib/api/error-logs";
import { ApiRequestError } from "@/lib/api/client";
import { formatDateTime } from "@/lib/format";

export function ErrorLogsManager({ initialData }: { initialData: ErrorLogsPage }) {
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(false);
  const [confirmingClear, setConfirmingClear] = useState(false);
  const [viewing, setViewing] = useState<ErrorLog | null>(null);

  const totalPages = Math.max(1, Math.ceil(data.total / data.pageSize));

  async function loadPage(page: number) {
    setLoading(true);
    try {
      setData(await getErrorLogs(page, data.pageSize));
    } catch (error) {
      const message =
        error instanceof ApiRequestError ? error.message : "ჟურნალის ჩატვირთვა ვერ მოხერხდა";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  const columns: DataTableColumn<ErrorLog>[] = [
    { header: "დრო", render: (log) => formatDateTime(log.createdAt) },
    {
      header: "შეტყობინება",
      render: (log) => log.message,
      cellClassName: "max-w-xl truncate",
    },
  ];

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">შეცდომების ჟურნალი</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            ბექენდზე დაფიქსირებული შეცდომების ისტორია — სულ {data.total} ჩანაწერი. მოიცავს როგორც
            მომხმარებელთან 500-ად მისულ, ისე ფონურ (FINA, ელფოსტის გაგზავნა და სხვ.) შეცდომებს, არა
            მხოლოდ სერვერის ლოგებში დარჩენილს.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {loading && <Loader size="sm" label="იტვირთება" />}
          <button
            type="button"
            onClick={() => setConfirmingClear(true)}
            disabled={data.total === 0}
            className="rounded-full border border-red-500/30 px-4 py-2 text-sm font-semibold text-red-600 transition-colors hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-50"
          >
            გასუფთავება
          </button>
        </div>
      </div>

      <div className="mt-6">
        <DataTable
          columns={columns}
          data={data.logs}
          getRowKey={(log) => log.id}
          emptyMessage="შეცდომები არ დაფიქსირებულა"
          actions={(log) => (
            <button
              type="button"
              onClick={() => setViewing(log)}
              className="rounded-full border border-border px-3 py-1 text-xs font-semibold text-foreground transition-colors hover:bg-muted"
            >
              დეტალები
            </button>
          )}
        />
      </div>

      <Pagination currentPage={data.page} totalPages={totalPages} onPageChange={loadPage} />

      <Modal
        open={viewing !== null}
        onClose={() => setViewing(null)}
        title="შეცდომის დეტალები"
        size="2xl"
      >
        {viewing && (
          <div className="flex flex-col gap-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">დრო</p>
              <p className="mt-1 text-sm">{formatDateTime(viewing.createdAt)}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                შეტყობინება
              </p>
              <p className="mt-1 text-sm">{viewing.message}</p>
            </div>
            {viewing.context && (
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  კონტექსტი
                </p>
                <pre className="mt-1 max-h-48 overflow-auto rounded-lg bg-muted p-3 text-xs">
                  {JSON.stringify(viewing.context, null, 2)}
                </pre>
              </div>
            )}
            {viewing.stack && (
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Stack trace
                </p>
                <pre className="mt-1 max-h-64 overflow-auto rounded-lg bg-muted p-3 text-xs">
                  {viewing.stack}
                </pre>
              </div>
            )}
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={confirmingClear}
        onClose={() => setConfirmingClear(false)}
        title="ჟურნალის გასუფთავება"
        message="დარწმუნებული ხართ, რომ გსურთ ყველა ჩანაწერის წაშლა? ამ მოქმედების გაუქმება შეუძლებელია."
        confirmLabel="გასუფთავება"
        successMessage="ჟურნალი გასუფთავდა"
        onConfirm={async () => {
          await clearErrorLogs();
          setData({ logs: [], total: 0, page: 1, pageSize: data.pageSize });
        }}
      />
    </div>
  );
}
