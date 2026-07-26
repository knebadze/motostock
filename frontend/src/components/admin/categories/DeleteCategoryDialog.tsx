"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Modal } from "@/components/shared/Modal";
import { deleteCategory, type Category } from "@/lib/api/categories";
import { ApiRequestError } from "@/lib/api/client";

export function DeleteCategoryDialog({
  open,
  onClose,
  onDeleted,
  category,
}: {
  open: boolean;
  onClose: () => void;
  onDeleted: () => void;
  category: Category | null;
}) {
  const [loading, setLoading] = useState(false);

  async function handleConfirm() {
    if (!category) return;
    setLoading(true);

    try {
      await deleteCategory(category.id);
      toast.success("კატეგორია წაიშალა");
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
    <Modal open={open} onClose={onClose} title="კატეგორიის წაშლა">
      <p className="text-sm text-muted-foreground">
        დარწმუნებული ხართ, რომ გსურთ წაშალოთ კატეგორია{" "}
        <span className="font-semibold text-foreground">{category?.name.ka}</span>?
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
