"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ApiRequestError } from "@/lib/api/client";
import { formatDateTime } from "@/lib/format";
import {
  listCallbackRequests,
  resolveCallbackRequest,
  type CallbackRequest,
} from "@/lib/api/callback-requests";
import { ORDER_REQUESTS_CHANGED_EVENT } from "@/components/admin/AdminOrderRequestNotifications";

function CallbackCard({
  request,
  onResolved,
}: {
  request: CallbackRequest;
  onResolved: (request: CallbackRequest) => void;
}) {
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleResolve() {
    setSaving(true);
    try {
      onResolved(await resolveCallbackRequest(request.id, note.trim()));
      toast.success("თხოვნა დამუშავებულად მოინიშნა");
    } catch (error) {
      toast.error(error instanceof ApiRequestError ? error.message : "თხოვნის განახლება ვერ მოხერხდა");
    } finally {
      setSaving(false);
    }
  }

  return (
    <li className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-sky-500/10 px-2.5 py-0.5 text-xs font-semibold text-sky-600">
            დარეკვის თხოვნა
          </span>
          <span className="font-semibold text-foreground">{request.itemTitle}</span>
          {!request.vehicleListing && <span className="text-xs text-muted-foreground">(განცხადება წაშლილია)</span>}
        </div>
        <span className="text-xs text-muted-foreground">{formatDateTime(request.createdAt)}</span>
      </div>

      <div className="grid gap-3 text-sm sm:grid-cols-2">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">მომხმარებელი</p>
          <p className="mt-1 text-foreground">{request.name}</p>
          <a href={`tel:${request.phone}`} className="block font-medium text-primary-text hover:underline">
            {request.phone}
          </a>
          {request.preferredTime && (
            <p className="text-muted-foreground">სასურველი დრო: {request.preferredTime}</p>
          )}
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">შენიშვნა</p>
          <p className="mt-1 whitespace-pre-line text-foreground">{request.note || "—"}</p>
        </div>
      </div>

      {request.status === "OPEN" ? (
        <div className="flex flex-col gap-2 border-t border-border pt-3 sm:flex-row sm:items-end">
          <label className="flex flex-1 flex-col gap-1 text-sm">
            <span className="text-xs font-medium text-muted-foreground">შენიშვნა (შიდა, არასავალდებულო)</span>
            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              rows={2}
              maxLength={1000}
              placeholder="მაგ. დავურეკე, ხვალ მოვა შოურუმში"
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </label>
          <button
            type="button"
            onClick={() => void handleResolve()}
            disabled={saving}
            className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover disabled:opacity-50"
          >
            {saving ? "ინახება..." : "დავურეკე — დახურვა"}
          </button>
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

// "Call me back" requests from showroom-only listing pages — the second
// section of the customer requests inbox.
export function CallbackRequestsPanel({
  initialOpen,
  onOpenCountChange,
}: {
  initialOpen: CallbackRequest[];
  onOpenCountChange: (count: number) => void;
}) {
  const [tab, setTab] = useState<"OPEN" | "RESOLVED">("OPEN");
  const [open, setOpen] = useState(initialOpen);
  const [resolved, setResolved] = useState<CallbackRequest[] | null>(null);
  const [loading, setLoading] = useState(false);

  async function showTab(next: "OPEN" | "RESOLVED") {
    setTab(next);
    setLoading(true);
    try {
      if (next === "OPEN") {
        const items = await listCallbackRequests("OPEN");
        setOpen(items);
        onOpenCountChange(items.length);
      } else {
        setResolved(await listCallbackRequests("RESOLVED"));
      }
    } catch {
      toast.error("თხოვნების ჩატვირთვა ვერ მოხერხდა");
    } finally {
      setLoading(false);
    }
  }

  function handleResolved(updated: CallbackRequest) {
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
        მომხმარებელმა მოტოს განცხადების გვერდიდან ითხოვა დარეკვა. დაურეკეთ და მონიშნეთ დამუშავებულად.
      </p>
      <div className="mt-4 flex gap-2">
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
          {tab === "OPEN" ? "ღია თხოვნა არ არის." : "დამუშავებული თხოვნა ჯერ არ არის."}
        </p>
      ) : (
        <ul className="mt-6 flex flex-col gap-3">
          {items.map((request) => (
            <CallbackCard key={request.id} request={request} onResolved={handleResolved} />
          ))}
        </ul>
      )}
    </div>
  );
}
