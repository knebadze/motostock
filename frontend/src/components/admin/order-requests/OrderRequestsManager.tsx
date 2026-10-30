"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ApiRequestError } from "@/lib/api/client";
import { formatDateTime, formatPrice } from "@/lib/format";
import { Select } from "@/components/shared/Select";
import {
  listOrderRequests,
  resolveOrderRequest,
  updateOrderStatus,
  type AdminOrderRequest,
} from "@/lib/api/orders";
import { listLookupItems, type LookupItem } from "@/lib/api/lookups";
import { ORDER_REQUESTS_CHANGED_EVENT } from "@/components/admin/AdminOrderRequestNotifications";

type Tab = "OPEN" | "RESOLVED";

const TYPE_LABELS: Record<AdminOrderRequest["type"], string> = {
  CANCEL: "გაუქმების მოთხოვნა",
  RETURN: "დაბრუნების მოთხოვნა",
};

type CardMode = "idle" | "cancelOrder" | "closeOnly";

function RequestCard({
  request,
  cancelledStatusId,
  loadCancellationReasons,
  onResolved,
  onOrderCancelled,
}: {
  request: AdminOrderRequest;
  // null — no CANCELLED status configured; the cancel action is hidden.
  cancelledStatusId: number | null;
  loadCancellationReasons: () => Promise<LookupItem[]>;
  onResolved: (request: AdminOrderRequest) => void;
  onOrderCancelled: (requestId: number) => void;
}) {
  const [mode, setMode] = useState<CardMode>("idle");
  const [note, setNote] = useState("");
  const [reasons, setReasons] = useState<LookupItem[] | null>(null);
  const [reasonId, setReasonId] = useState("");
  const [saving, setSaving] = useState(false);

  // Only a cancel request can be answered by cancelling the order here; a
  // return is handled in the shop and then closed.
  const canCancelOrder =
    request.type === "CANCEL" && cancelledStatusId != null && request.order.status.key !== "CANCELLED";

  async function openCancelForm() {
    setMode("cancelOrder");
    if (reasons) return;
    try {
      setReasons(await loadCancellationReasons());
    } catch {
      setMode("idle");
      toast.error("გაუქმების მიზეზების ჩატვირთვა ვერ მოხერხდა");
    }
  }

  function closeForm() {
    setMode("idle");
    setNote("");
    setReasonId("");
  }

  // The same status change as in the order detail (stock back, FINA return,
  // ORDER_CANCELLED email) — and the backend resolves this open cancel
  // request in that same transaction.
  async function handleCancelOrder() {
    if (cancelledStatusId == null || !reasonId) return;
    setSaving(true);
    try {
      await updateOrderStatus(request.order.id, cancelledStatusId, Number(reasonId), note.trim() || undefined);
      onOrderCancelled(request.id);
      toast.success("შეკვეთა გაუქმდა — მარაგი დაბრუნდა და მომხმარებელს ეცნობა იმეილით");
    } catch (error) {
      toast.error(error instanceof ApiRequestError ? error.message : "შეკვეთის გაუქმება ვერ მოხერხდა");
    } finally {
      setSaving(false);
    }
  }

  async function handleCloseOnly() {
    setSaving(true);
    try {
      onResolved(await resolveOrderRequest(request.id, note.trim()));
      toast.success("მოთხოვნა დაიხურა — შეკვეთა უცვლელია");
    } catch (error) {
      toast.error(error instanceof ApiRequestError ? error.message : "მოთხოვნის განახლება ვერ მოხერხდა");
    } finally {
      setSaving(false);
    }
  }

  return (
    <li className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
              request.type === "CANCEL" ? "bg-red-500/10 text-destructive" : "bg-amber-500/10 text-amber-600"
            }`}
          >
            {TYPE_LABELS[request.type]}
          </span>
          <Link
            href={`/admin/orders?order=${request.order.id}`}
            className="font-semibold text-primary-text hover:underline"
          >
            #{request.order.orderCode}
          </Link>
          <span className="text-sm text-muted-foreground">
            {formatPrice(request.order.total)} · {request.order.status.nameKa}
          </span>
        </div>
        <span className="text-xs text-muted-foreground">{formatDateTime(request.createdAt)}</span>
      </div>

      <div className="grid gap-3 text-sm sm:grid-cols-2">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">მომხმარებელი</p>
          <p className="mt-1 text-foreground">
            {request.buyer.firstName} {request.buyer.lastName}
          </p>
          {request.buyer.phone && (
            <a href={`tel:${request.buyer.phone}`} className="block font-medium text-primary-text hover:underline">
              {request.buyer.phone}
            </a>
          )}
          <p className="text-muted-foreground">{request.buyer.email}</p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">მიზეზი</p>
          <p className="mt-1 whitespace-pre-line text-foreground">{request.reason || "—"}</p>
        </div>
      </div>

      {request.status === "OPEN" ? (
        <div className="flex flex-col gap-3 border-t border-border pt-3">
          {mode === "idle" && (
            <div className="flex flex-wrap gap-2">
              {canCancelOrder && (
                <button
                  type="button"
                  onClick={() => void openCancelForm()}
                  className="rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700"
                >
                  შეკვეთის გაუქმება
                </button>
              )}
              <button
                type="button"
                onClick={() => setMode("closeOnly")}
                className="rounded-full border border-border px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
              >
                {request.type === "CANCEL" ? "დახურვა გაუქმების გარეშე" : "დახურვა"}
              </button>
            </div>
          )}

          {mode === "cancelOrder" && (
            <div className="flex flex-col gap-3 rounded-xl border border-red-500/40 bg-red-500/5 p-3">
              <p className="text-sm font-semibold text-foreground">
                შეკვეთა #{request.order.orderCode} გაუქმდება: მარაგი დაბრუნდება, FINA-ში გაიგზავნება დაბრუნება და
                მომხმარებელს ეცნობება იმეილით. გაუქმება საბოლოოა.
              </p>
              {reasons ? (
                <>
                  <label className="flex flex-col gap-1 text-sm">
                    <span className="text-xs font-medium text-muted-foreground">გაუქმების მიზეზი *</span>
                    <Select
                      ariaLabel="გაუქმების მიზეზი"
                      options={reasons.map((reason) => ({ value: String(reason.id), label: reason.nameKa }))}
                      value={reasonId}
                      onChange={setReasonId}
                      placeholder="აირჩიეთ მიზეზი"
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-sm">
                    <span className="text-xs font-medium text-muted-foreground">შენიშვნა (არასავალდებულო)</span>
                    <textarea
                      value={note}
                      onChange={(event) => setNote(event.target.value)}
                      rows={2}
                      maxLength={1000}
                      className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                    />
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => void handleCancelOrder()}
                      disabled={saving || !reasonId}
                      className="rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-50"
                    >
                      {saving ? "უქმდება..." : "გაუქმების დადასტურება"}
                    </button>
                    <button
                      type="button"
                      onClick={closeForm}
                      disabled={saving}
                      className="rounded-full border border-border px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
                    >
                      უკან
                    </button>
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">იტვირთება...</p>
              )}
            </div>
          )}

          {mode === "closeOnly" && (
            <div className="flex flex-col gap-3 rounded-xl border border-border p-3">
              <p className="text-sm text-muted-foreground">
                მოთხოვნა დაიხურება, შეკვეთა კი უცვლელი დარჩება (მაგ. მომხმარებელმა გადაიფიქრა).
              </p>
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-xs font-medium text-muted-foreground">შენიშვნა (შიდა, არასავალდებულო)</span>
                <textarea
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  rows={2}
                  maxLength={1000}
                  placeholder="მაგ. დავუკავშირდი, შეკვეთას ტოვებს"
                  className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                />
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void handleCloseOnly()}
                  disabled={saving}
                  className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover disabled:opacity-50"
                >
                  {saving ? "ინახება..." : "მოთხოვნის დახურვა"}
                </button>
                <button
                  type="button"
                  onClick={closeForm}
                  disabled={saving}
                  className="rounded-full border border-border px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
                >
                  უკან
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="border-t border-border pt-3 text-sm text-muted-foreground">
          დამუშავდა {request.resolvedAt ? formatDateTime(request.resolvedAt) : ""}
          {request.resolvedBy ? ` · ${request.resolvedBy.firstName} ${request.resolvedBy.lastName}` : ""}
          {request.adminNote && <p className="mt-1 whitespace-pre-line text-foreground">{request.adminNote}</p>}
        </div>
      )}
    </li>
  );
}

// Customer cancel/return requests inbox. A request is only a message: the
// staff member calls the customer, cancels the order in /admin/orders when
// agreed (that also auto-resolves an open cancel request) or handles the
// return in the shop, then marks the request handled here.
export function OrderRequestsManager({
  initialOpen,
  cancelledStatusId,
  onOpenCountChange,
}: {
  initialOpen: AdminOrderRequest[];
  cancelledStatusId: number | null;
  onOpenCountChange: (count: number) => void;
}) {
  const [tab, setTab] = useState<Tab>("OPEN");
  const [open, setOpen] = useState(initialOpen);
  const [resolved, setResolved] = useState<AdminOrderRequest[] | null>(null);
  const [loading, setLoading] = useState(false);

  async function showTab(next: Tab) {
    setTab(next);
    setLoading(true);
    try {
      if (next === "OPEN") {
        const items = await listOrderRequests("OPEN");
        setOpen(items);
        onOpenCountChange(items.length);
      }
      else setResolved(await listOrderRequests("RESOLVED"));
    } catch {
      toast.error("მოთხოვნების ჩატვირთვა ვერ მოხერხდა");
    } finally {
      setLoading(false);
    }
  }

  // Fetched once, on the first "cancel order" click, then shared by every card.
  const [reasonsPromise, setReasonsPromise] = useState<Promise<LookupItem[]> | null>(null);
  function loadCancellationReasons() {
    if (reasonsPromise) return reasonsPromise;
    const promise = listLookupItems("cancellation-reasons");
    promise.catch(() => setReasonsPromise(null));
    setReasonsPromise(promise);
    return promise;
  }

  // The backend resolved the request along with the cancellation; the
  // resolved tab reloads when opened.
  function handleOrderCancelled(requestId: number) {
    const next = open.filter((item) => item.id !== requestId);
    setOpen(next);
    onOpenCountChange(next.length);
    setResolved(null);
    window.dispatchEvent(new Event(ORDER_REQUESTS_CHANGED_EVENT));
  }

  function handleResolved(updated: AdminOrderRequest) {
    const next = open.filter((item) => item.id !== updated.id);
    setOpen(next);
    onOpenCountChange(next.length);
    setResolved((current) => (current ? [updated, ...current] : current));
    window.dispatchEvent(new Event(ORDER_REQUESTS_CHANGED_EVENT));
  }

  const items = tab === "OPEN" ? open : (resolved ?? []);

  return (
    <div>
      <p className="text-sm text-muted-foreground">
        შეკვეთის გაუქმებისა და დაბრუნების მოთხოვნები. დაუკავშირდით მომხმარებელს, საჭიროებისამებრ გააუქმეთ შეკვეთა
        და მონიშნეთ მოთხოვნა დამუშავებულად.
      </p>

      <div className="mt-6 flex gap-2">
        {(["OPEN", "RESOLVED"] as const).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => void showTab(value)}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
              tab === value
                ? "bg-primary text-primary-foreground"
                : "border border-border text-foreground hover:bg-muted"
            }`}
          >
            {value === "OPEN" ? `ღია (${open.length})` : "დამუშავებული"}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="mt-6 text-sm text-muted-foreground">იტვირთება...</p>
      ) : items.length === 0 ? (
        <p className="mt-6 text-sm text-muted-foreground">
          {tab === "OPEN" ? "ღია მოთხოვნა არ არის." : "დამუშავებული მოთხოვნა ჯერ არ არის."}
        </p>
      ) : (
        <ul className="mt-6 flex flex-col gap-3">
          {items.map((request) => (
            <RequestCard
              key={request.id}
              request={request}
              cancelledStatusId={cancelledStatusId}
              loadCancellationReasons={loadCancellationReasons}
              onResolved={handleResolved}
              onOrderCancelled={handleOrderCancelled}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
