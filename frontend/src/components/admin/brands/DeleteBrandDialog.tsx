"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Modal } from "@/components/shared/Modal";
import { deleteBrand, type Brand } from "@/lib/api/brands";
import { ApiRequestError } from "@/lib/api/client";

export function DeleteBrandDialog({
  open,
  onClose,
  onDeleted,
  brand,
}: {
  open: boolean;
  onClose: () => void;
  onDeleted: () => void;
  brand: Brand | null;
}) {
  const [loading, setLoading] = useState(false);

  async function handleConfirm() {
    if (!brand) return;
    setLoading(true);

    try {
      await deleteBrand(brand.id);
      toast.success("მარკა წაიშალა");
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
    <Modal open={open} onClose={onClose} title="მარკის წაშლა">
      <p className="text-sm text-muted-foreground">
        დარწმუნებული ხართ, რომ გსურთ წაშალოთ მარკა{" "}
        <span className="font-semibold text-foreground">{brand?.name.ka}</span>?
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
