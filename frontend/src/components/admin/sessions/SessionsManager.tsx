"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { DataTable, type DataTableColumn } from "@/components/shared/DataTable";
import { Pagination, useServerPagination, type PagedResult } from "@/components/shared/Pagination";
import { Loader } from "@/components/shared/Loader";
import { listSessions, revokeSession, type Session } from "@/lib/api/sessions";
import { ApiRequestError } from "@/lib/api/client";
import { formatDateTime } from "@/lib/format";

const columns: DataTableColumn<Session>[] = [
  {
    header: "მომხმარებელი",
    render: (session) => (
      <div>
        <p className="font-medium text-foreground">{session.user.name}</p>
        <p className="text-xs text-muted-foreground">{session.user.email}</p>
      </div>
    ),
  },
  {
    header: "IP მისამართი",
    render: (session) => session.ipAddress ?? "—",
    cellClassName: "text-muted-foreground",
  },
  {
    header: "მოწყობილობა",
    render: (session) => (
      <span className="block max-w-xs truncate" title={session.userAgent ?? undefined}>
        {session.userAgent ?? "—"}
      </span>
    ),
    cellClassName: "text-muted-foreground",
  },
  {
    header: "შესვლის დრო",
    render: (session) => formatDateTime(session.createdAt),
    cellClassName: "text-muted-foreground",
  },
  {
    header: "ბოლო აქტივობა",
    render: (session) => formatDateTime(session.lastSeenAt),
    cellClassName: "text-muted-foreground",
  },
];

export function SessionsManager({ initialData }: { initialData: PagedResult<Session> }) {
  const { data, totalPages, loading, load } = useServerPagination<Session>(initialData);
  const [revokingSession, setRevokingSession] = useState<Session | null>(null);

  function loadPage(page: number) {
    return load(
      () => listSessions({ page, pageSize: data.pageSize }),
      (error) => {
        toast.error(error instanceof ApiRequestError ? error.message : "სესიების ჩატვირთვა ვერ მოხერხდა");
      },
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">აქტიური სესიები</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            ყველა მომხმარებლის შესული სესია — სულ {data.total}. სესიის გაუქმება იძულებით
            გამოაბრძანებს შესაბამის მოწყობილობას შემდეგ მოთხოვნაზე.
          </p>
        </div>
        {loading && <Loader size="sm" label="იტვირთება" />}
      </div>

      <div className="mt-6">
        <DataTable
          columns={columns}
          data={data.items}
          getRowKey={(session) => session.id}
          emptyMessage="აქტიური სესია არ არსებობს"
          actions={(session) => (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setRevokingSession(session)}
                className="rounded-full border border-red-500/40 px-3 py-1 text-xs font-semibold text-red-600 transition-colors hover:bg-red-500/10"
              >
                გაუქმება
              </button>
            </div>
          )}
        />
        <Pagination currentPage={data.page} totalPages={totalPages} onPageChange={loadPage} />
      </div>

      <ConfirmDialog
        open={revokingSession !== null}
        onClose={() => setRevokingSession(null)}
        title="სესიის გაუქმება"
        confirmLabel="გაუქმება"
        message={
          <>
            დარწმუნებული ხართ, რომ გსურთ გააუქმოთ{" "}
            <span className="font-semibold text-foreground">{revokingSession?.user.name}</span>-ის
            ეს სესია? მოწყობილობა იძულებით გამოვა სისტემიდან შემდეგ მოთხოვნაზე.
          </>
        }
        successMessage="სესია გაუქმდა"
        onConfirm={async () => {
          if (!revokingSession) return;
          await revokeSession(revokingSession.id);
          await loadPage(data.page);
        }}
      />
    </div>
  );
}
