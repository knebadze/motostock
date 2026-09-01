"use client";

import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Modal } from "./Modal";
import { Loader } from "./Loader";
import { ApiRequestError } from "@/lib/api/client";

export function ConfirmDialog({
  open,
  onClose,
  title,
  message,
  confirmLabel = "წაშლა",
  successMessage,
  onConfirm,
  cancelLabel = "გაუქმება",
  processingLabel = "მუშავდება...",
  errorFallback = "მოქმედება ვერ შესრულდა",
  resolveErrorMessage,
  closeLabel = "დახურვა",
  loaderLabel = "იტვირთება",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  successMessage?: string;
  onConfirm: () => Promise<void>;
  // Georgian defaults match the admin panel's untranslated copy —
  // storefront callers pass next-intl-translated overrides.
  cancelLabel?: string;
  processingLabel?: string;
  errorFallback?: string;
  // Storefront callers pass `(error) => resolveApiErrorMessage(error, tErrors,
  // errorFallback)` (see lib/api-errors.ts) to show a translated message for
  // a backend error instead of its raw (always-Georgian) text — a prop, not
  // a `useTranslations` call in here, since this component is also used
  // under /admin, which sits outside next-intl's provider tree entirely
  // (calling the hook there would throw). Omitted, admin callers keep
  // today's behavior unchanged: ApiRequestError shows verbatim, anything
  // else falls back to `errorFallback`.
  resolveErrorMessage?: (error: unknown) => string;
  closeLabel?: string;
  loaderLabel?: string;
}) {
  const [loading, setLoading] = useState(false);

  async function handleConfirm() {
    setLoading(true);
    try {
      await onConfirm();
      if (successMessage) toast.success(successMessage);
      onClose();
    } catch (error) {
      const message = resolveErrorMessage
        ? resolveErrorMessage(error)
        : error instanceof ApiRequestError
          ? error.message
          : errorFallback;
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={title} closeLabel={closeLabel}>
      <div className="text-sm text-muted-foreground">{message}</div>

      <div className="mt-6 flex justify-end gap-3">
        <button
          type="button"
          onClick={onClose}
          className="rounded-full border border-border px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:border-primary hover:text-primary"
        >
          {cancelLabel}
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={loading}
          className="flex items-center gap-2 rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-500 disabled:opacity-50"
        >
          {loading && <Loader size="xs" label={loaderLabel} />}
          {loading ? processingLabel : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
