"use client";

import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Modal } from "./Modal";
import { ApiRequestError } from "@/lib/api/client";

export function ConfirmDialog({
  open,
  onClose,
  title,
  message,
  confirmLabel = "წაშლა",
  successMessage,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  successMessage?: string;
  onConfirm: () => Promise<void>;
}) {
  const [loading, setLoading] = useState(false);

  async function handleConfirm() {
    setLoading(true);
    try {
      await onConfirm();
      if (successMessage) toast.success(successMessage);
      onClose();
    } catch (error) {
      const message =
        error instanceof ApiRequestError ? error.message : "მოქმედება ვერ შესრულდა";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={title}>
      <div className="text-sm text-muted-foreground">{message}</div>

      <div className="mt-6 flex justify-end gap-3">
        <button
          type="button"
          onClick={onClose}
          className="rounded-full border border-border px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:border-primary hover:text-primary"
        >
          გაუქმება
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={loading}
          className="rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-500 disabled:opacity-50"
        >
          {loading ? "მუშავდება..." : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
