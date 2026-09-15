"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { DataTable, type DataTableColumn } from "@/components/shared/DataTable";
import { Pagination, useServerPagination } from "@/components/shared/Pagination";
import { Loader } from "@/components/shared/Loader";
import { RowActions } from "@/components/shared/RowActions";
import {
  deleteBulkDiscountEvent,
  listBulkDiscountEvents,
  type BulkDiscountEvent,
} from "@/lib/api/bulk-discount-events";
import { ApiRequestError, resolveMediaUrl } from "@/lib/api/client";
import { formatDate } from "@/lib/format";
import { EditBulkDiscountEventModal } from "./EditBulkDiscountEventModal";
import { RepeatBulkDiscountEventModal } from "./RepeatBulkDiscountEventModal";

const TARGET_TYPE_LABELS: Record<BulkDiscountEvent["targetType"], string> = {
  PRODUCT: "პროდუქტი",
  VEHICLE_LISTING: "ტრანსპორტი",
};

const EMPTY_PAGE = { items: [] as BulkDiscountEvent[], total: 0, page: 1, pageSize: 20 };

export function DiscountEventsPanel() {
  const { data, totalPages, loading, load } = useServerPagination<BulkDiscountEvent>(EMPTY_PAGE);
  const [repeatingEvent, setRepeatingEvent] = useState<BulkDiscountEvent | null>(null);
  const [editingEvent, setEditingEvent] = useState<BulkDiscountEvent | null>(null);
  const [deletingEvent, setDeletingEvent] = useState<BulkDiscountEvent | null>(null);

  function fetchPage(page: number) {
    return listBulkDiscountEvents({ page, pageSize: data.pageSize });
  }

  function loadPage(page: number) {
    load(
      () => fetchPage(page),
      (error) => {
        toast.error(error instanceof ApiRequestError ? error.message : "სიის ჩატვირთვა ვერ მოხერხდა");
      },
    );
  }

  useEffect(() => {
    loadPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const columns: DataTableColumn<BulkDiscountEvent>[] = [
    {
      header: "",
      render: (event) =>
        resolveMediaUrl(event.imageUrl) ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={resolveMediaUrl(event.imageUrl) ?? undefined}
            alt=""
            className="size-10 rounded-lg border border-border object-cover"
          />
        ) : (
          <div className="size-10 rounded-lg border border-dashed border-border" />
        ),
    },
    { header: "სახელი", render: (event) => event.nameKa },
    {
      header: "ტიპი",
      render: (event) => (
        <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">
          {TARGET_TYPE_LABELS[event.targetType]}
        </span>
      ),
    },
    { header: "პროცენტი", render: (event) => `${event.discountPercent}%` },
    {
      header: "პერიოდი",
      render: (event) => `${formatDate(event.startDate)} — ${formatDate(event.endDate)}`,
      cellClassName: "text-muted-foreground",
    },
    { header: "ერთეულები", render: (event) => event.itemCount, cellClassName: "text-muted-foreground" },
    {
      header: "შექმნის თარიღი",
      render: (event) => formatDate(event.createdAt),
      cellClassName: "text-muted-foreground",
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          სახელდებული, დაჯგუფებული ფასდაკლების ივენთები — მასობრივი ფასდაკლების გამოყენებისას
          &quot;შექმენი ივენთად&quot; ჩართვით შექმნილი. ივენთის წაშლა თავად ფასდაკლებებს არ ეხება.
        </p>
        {loading && <Loader size="sm" label="იტვირთება" />}
      </div>

      <div className="mt-4">
        <DataTable
          columns={columns}
          data={data.items}
          getRowKey={(event) => event.id}
          emptyMessage="ივენთი ჯერ არ შექმნილა"
          actions={(event) => (
            <RowActions
              onEdit={() => setEditingEvent(event)}
              onDelete={() => setDeletingEvent(event)}
              extra={
                <button
                  type="button"
                  onClick={() => setRepeatingEvent(event)}
                  aria-label="გამეორება"
                  title="გამეორება"
                  className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-primary"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="size-4"
                  >
                    <path d="m17 2 4 4-4 4" />
                    <path d="M3 11v-1a4 4 0 0 1 4-4h14" />
                    <path d="m7 22-4-4 4-4" />
                    <path d="M21 13v1a4 4 0 0 1-4 4H3" />
                  </svg>
                </button>
              }
            />
          )}
        />
        <Pagination currentPage={data.page} totalPages={totalPages} onPageChange={loadPage} />
      </div>

      <EditBulkDiscountEventModal
        key={editingEvent?.id ?? "none"}
        event={editingEvent}
        onClose={() => setEditingEvent(null)}
        onSaved={() => loadPage(data.page)}
      />

      <RepeatBulkDiscountEventModal
        event={repeatingEvent}
        onClose={() => setRepeatingEvent(null)}
        onRepeated={() => loadPage(data.page)}
      />

      <ConfirmDialog
        open={deletingEvent !== null}
        onClose={() => setDeletingEvent(null)}
        title="ივენთის წაშლა"
        message={
          <>
            დარწმუნებული ხართ, რომ გსურთ წაშალოთ{" "}
            <span className="font-semibold text-foreground">{deletingEvent?.nameKa}</span>? ამ ივენთის
            ქვეშ დაჯგუფებული ფასდაკლებები არ წაიშლება — ისინი დამოუკიდებლად გააგრძელებენ არსებობას.
          </>
        }
        successMessage="ივენთი წაიშალა"
        onConfirm={async () => {
          if (!deletingEvent) return;
          await deleteBulkDiscountEvent(deletingEvent.id);
          await loadPage(data.page);
        }}
      />
    </div>
  );
}
