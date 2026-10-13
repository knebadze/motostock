"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Modal } from "@/components/shared/Modal";
import { resolveApiErrorMessage } from "@/lib/api-errors";
import { formatDateTime } from "@/lib/format";
import { createOrderRequest, type OrderRequest, type OrderRequestType } from "@/lib/api/orders";

const CANCELLABLE_STATUS_KEYS = new Set(["PENDING", "CONFIRMED"]);

// Customer side of the cancel/return request flow (backend
// order-requests.service.ts). Sending one never changes the order — it
// notifies the shop, and the panel then tells the customer the shop will
// call them (or that they can call the shop). The same eligibility rules
// as the backend decide which button shows; the backend still enforces them.
export function OrderRequestPanel({
  orderId,
  statusKey,
  returnWindowOpen,
  returnPeriodDays,
  initialRequests,
  shopPhone,
}: {
  orderId: number;
  statusKey: string;
  // Still inside the return window (computed on the server from when the
  // order reached DELIVERED; always true when no window is configured).
  returnWindowOpen: boolean;
  // For the "returns within N days" note — 0 hides it.
  returnPeriodDays: number;
  initialRequests: OrderRequest[];
  shopPhone: string | null;
}) {
  const t = useTranslations("Account.orders");
  const tErrors = useTranslations("ApiErrors");
  const [requests, setRequests] = useState(initialRequests);
  const [dialogType, setDialogType] = useState<OrderRequestType | null>(null);
  const [reason, setReason] = useState("");
  const [sending, setSending] = useState(false);

  const openOf = (type: OrderRequestType) =>
    requests.find((request) => request.type === type && request.status === "OPEN");
  const lastResolvedOf = (type: OrderRequestType) =>
    requests.find((request) => request.type === type && request.status === "RESOLVED");

  const canCancel = CANCELLABLE_STATUS_KEYS.has(statusKey) && !openOf("CANCEL");
  const canReturn = statusKey === "DELIVERED" && returnWindowOpen && !openOf("RETURN");

  const openRequests = (["CANCEL", "RETURN"] as const)
    .map((type) => openOf(type))
    .filter((request): request is OrderRequest => request != null);
  const resolvedRequests = (["CANCEL", "RETURN"] as const)
    .filter((type) => !openOf(type))
    .map((type) => lastResolvedOf(type))
    .filter((request): request is OrderRequest => request != null);

  if (!canCancel && !canReturn && openRequests.length === 0 && resolvedRequests.length === 0) return null;

  async function handleSubmit() {
    if (!dialogType) return;
    setSending(true);
    try {
      const order = await createOrderRequest(orderId, { type: dialogType, reason: reason.trim() || undefined });
      setRequests(order.requests);
      setDialogType(null);
      setReason("");
      toast.success(t("requestSentToast"));
    } catch (error) {
      toast.error(resolveApiErrorMessage(error, tErrors, t("requestError")));
    } finally {
      setSending(false);
    }
  }

  const contactLine = (
    <p className="mt-1 text-sm text-muted-foreground">
      {shopPhone ? (
        <>
          {t("requestContactNoteWithPhone")}{" "}
          <a href={`tel:${shopPhone}`} className="font-semibold text-primary-text hover:underline">
            {shopPhone}
          </a>
        </>
      ) : (
        t("requestContactNote")
      )}
    </p>
  );

  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <h2 className="font-semibold text-foreground">{t("requestsHeading")}</h2>

      {openRequests.map((request) => (
        <div key={request.id} className="mt-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4">
          <p className="text-sm font-semibold text-foreground">
            {t(request.type === "CANCEL" ? "requestOpenCancel" : "requestOpenReturn", {
              date: formatDateTime(request.createdAt),
            })}
          </p>
          {contactLine}
        </div>
      ))}

      {resolvedRequests.map((request) => (
        <p key={request.id} className="mt-3 text-sm text-muted-foreground">
          {t(request.type === "CANCEL" ? "requestResolvedCancel" : "requestResolvedReturn", {
            date: formatDateTime(request.resolvedAt ?? request.createdAt),
          })}
        </p>
      ))}

      {(canCancel || canReturn) && (
        <div className="mt-4 flex flex-col gap-2">
          <div className="flex flex-wrap gap-3">
            {canCancel && (
              <button
                type="button"
                onClick={() => setDialogType("CANCEL")}
                className="rounded-full border border-border px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:border-red-500 hover:text-red-600"
              >
                {t("requestCancelButton")}
              </button>
            )}
            {canReturn && (
              <button
                type="button"
                onClick={() => setDialogType("RETURN")}
                className="rounded-full border border-border px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:border-primary hover:text-primary-text"
              >
                {t("requestReturnButton")}
              </button>
            )}
          </div>
          {canReturn && returnPeriodDays > 0 && (
            <p className="text-xs text-muted-foreground">{t("returnWindowNote", { days: returnPeriodDays })}</p>
          )}
        </div>
      )}

      <Modal
        open={dialogType != null}
        onClose={() => !sending && setDialogType(null)}
        title={dialogType === "RETURN" ? t("requestReturnTitle") : t("requestCancelTitle")}
        closeLabel={t("requestClose")}
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">{t("requestIntro")}</p>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-foreground">{t("requestReasonLabel")}</span>
            <textarea
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              rows={4}
              maxLength={1000}
              placeholder={t("requestReasonPlaceholder")}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </label>
          <div className="flex flex-wrap justify-end gap-3">
            <button
              type="button"
              onClick={() => setDialogType(null)}
              disabled={sending}
              className="rounded-full border border-border px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
            >
              {t("requestClose")}
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={sending}
              className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover disabled:opacity-50"
            >
              {sending ? t("requestSending") : t("requestSubmit")}
            </button>
          </div>
        </div>
      </Modal>
    </section>
  );
}
