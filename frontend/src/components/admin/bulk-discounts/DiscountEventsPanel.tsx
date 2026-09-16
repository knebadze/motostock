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
import { VEHICLE_ROOT_CATEGORY_SLUG } from "@/lib/categories-tree";
import { EditBulkDiscountEventModal } from "./EditBulkDiscountEventModal";
import { EventHeroSlideModal } from "./EventHeroSlideModal";
import { EventNewsletterModal } from "./EventNewsletterModal";
import { RepeatBulkDiscountEventModal } from "./RepeatBulkDiscountEventModal";

// Admin panel is KA-only (see backend architecture conventions), so the
// locale prefix is hardcoded rather than routed through next-intl's Link —
// this always opens the storefront, not another admin page.
function shopLinkFor(event: BulkDiscountEvent): string {
  const path = event.targetType === "VEHICLE_LISTING" ? `/${VEHICLE_ROOT_CATEGORY_SLUG}` : "/shop";
  return `/ka${path}?eventId=${event.id}`;
}

// A slide/campaign built from an expired event would either advertise a
// deal that no longer applies (newsletter) or already render inactive on
// the storefront (see hero-slides.service.ts's own expiry-aware isActive) —
// so both actions are disabled here rather than left to silently produce
// something pointless.
function isEventExpired(event: BulkDiscountEvent): boolean {
  return new Date() > new Date(event.endDate);
}

const TARGET_TYPE_LABELS: Record<BulkDiscountEvent["targetType"], string> = {
  PRODUCT: "პროდუქტი",
  VEHICLE_LISTING: "ტრანსპორტი",
};

const EMPTY_PAGE = { items: [] as BulkDiscountEvent[], total: 0, page: 1, pageSize: 20 };

export function DiscountEventsPanel() {
  const { data, totalPages, loading, load } = useServerPagination<BulkDiscountEvent>(EMPTY_PAGE);
  const [repeatingEvent, setRepeatingEvent] = useState<BulkDiscountEvent | null>(null);
  const [editingEvent, setEditingEvent] = useState<BulkDiscountEvent | null>(null);
  const [heroSlideEvent, setHeroSlideEvent] = useState<BulkDiscountEvent | null>(null);
  const [newsletterEvent, setNewsletterEvent] = useState<BulkDiscountEvent | null>(null);
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
                <>
                  <a
                    href={shopLinkFor(event)}
                    target="_blank"
                    rel="noreferrer"
                    aria-label="ნახვა მაღაზიაში"
                    title="ნახვა მაღაზიაში"
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
                      <path d="M15 3h6v6" />
                      <path d="M10 14 21 3" />
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                    </svg>
                  </a>
                  <button
                    type="button"
                    onClick={() => setHeroSlideEvent(event)}
                    disabled={isEventExpired(event)}
                    aria-label={event.heroSlideId != null ? "სლაიდის რედაქტირება" : "სლაიდის შექმნა"}
                    title={
                      isEventExpired(event)
                        ? "ვადაგასულია — სლაიდი ვეღარ შეიქმნება/რედაქტირდება"
                        : event.heroSlideId != null
                          ? "სლაიდის რედაქტირება"
                          : "სლაიდის შექმნა"
                    }
                    className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-primary disabled:pointer-events-none disabled:opacity-40"
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
                      <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
                      <circle cx="9" cy="9" r="2" />
                      <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewsletterEvent(event)}
                    disabled={isEventExpired(event)}
                    aria-label="მეილის გაგზავნა"
                    title={
                      isEventExpired(event)
                        ? "ვადაგასულია — მეილი ვეღარ გაიგზავნება"
                        : "მეილის გაგზავნა"
                    }
                    className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-primary disabled:pointer-events-none disabled:opacity-40"
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
                      <rect width="20" height="16" x="2" y="4" rx="2" />
                      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                    </svg>
                  </button>
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
                </>
              }
            />
          )}
        />
        <Pagination currentPage={data.page} totalPages={totalPages} onPageChange={loadPage} />
      </div>

      <EditBulkDiscountEventModal
        key={`edit-${editingEvent?.id ?? "none"}`}
        event={editingEvent}
        onClose={() => setEditingEvent(null)}
        onSaved={() => loadPage(data.page)}
      />

      <EventHeroSlideModal
        key={`hero-slide-${heroSlideEvent?.id ?? "none"}`}
        event={heroSlideEvent}
        onClose={() => setHeroSlideEvent(null)}
        onSaved={() => loadPage(data.page)}
      />

      <EventNewsletterModal
        key={`newsletter-${newsletterEvent?.id ?? "none"}`}
        event={newsletterEvent}
        onClose={() => setNewsletterEvent(null)}
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
