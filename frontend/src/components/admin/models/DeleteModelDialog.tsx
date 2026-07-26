"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Modal } from "@/components/shared/Modal";
import { deleteModel, type Model } from "@/lib/api/models";
import { ApiRequestError } from "@/lib/api/client";

export function DeleteModelDialog({
  open,
  onClose,
  onDeleted,
  model,
}: {
  open: boolean;
  onClose: () => void;
  onDeleted: () => void;
  model: Model | null;
}) {
  const [loading, setLoading] = useState(false);

  async function handleConfirm() {
    if (!model) return;
    setLoading(true);

    try {
      await deleteModel(model.id);
      toast.success("მოდელი წაიშალა");
      onDeleted();
      onClose();
    } catch (error) {
      const message =
        error instanceof ApiRequestError ? error.message : "წაშლა ვერ მოხერხდა";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="მოდელის წაშლა">
      <p className="text-sm text-muted-foreground">
        დარწმუნებული ხართ, რომ გსურთ წაშალოთ მოდელი{" "}
        <span className="font-semibold text-foreground">{model?.name.ka}</span>?
        ამ მოქმედების გაუქმება შეუძლებელია.
      </p>

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
          {loading ? "იშლება..." : "წაშლა"}
        </button>
      </div>
    </Modal>
  );
}
