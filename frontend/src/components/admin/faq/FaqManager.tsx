"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { Toggle } from "@/components/shared/Toggle";
import { deleteFaq, listFaqs, reorderFaqs, updateFaq, type Faq } from "@/lib/api/faq";
import { ApiRequestError } from "@/lib/api/client";
import { FaqFormModal } from "./FaqFormModal";

export function FaqManager({ initialFaqs }: { initialFaqs: Faq[] }) {
  const [faqs, setFaqs] = useState(initialFaqs);
  const [formOpen, setFormOpen] = useState(false);
  const [editingFaq, setEditingFaq] = useState<Faq | null>(null);
  const [deletingFaq, setDeletingFaq] = useState<Faq | null>(null);
  const [draggedId, setDraggedId] = useState<number | null>(null);

  async function refresh() {
    try {
      setFaqs(await listFaqs());
    } catch (error) {
      const message =
        error instanceof ApiRequestError ? error.message : "სიის განახლება ვერ მოხერხდა";
      toast.error(message);
    }
  }

  function openCreateModal() {
    setEditingFaq(null);
    setFormOpen(true);
  }

  function openEditModal(faq: Faq) {
    setEditingFaq(faq);
    setFormOpen(true);
  }

  async function handleToggleActive(faq: Faq, isActive: boolean) {
    const previous = faqs;
    setFaqs((current) => current.map((item) => (item.id === faq.id ? { ...item, isActive } : item)));
    try {
      await updateFaq(faq.id, { isActive });
    } catch (error) {
      setFaqs(previous);
      const message = error instanceof ApiRequestError ? error.message : "განახლება ვერ მოხერხდა";
      toast.error(message);
    }
  }

  async function handleDrop(targetId: number) {
    const currentDraggedId = draggedId;
    setDraggedId(null);
    if (currentDraggedId === null || currentDraggedId === targetId) return;

    const order = faqs.map((faq) => faq.id);
    const fromIndex = order.indexOf(currentDraggedId);
    const toIndex = order.indexOf(targetId);
    const nextOrder = [...order];
    nextOrder.splice(fromIndex, 1);
    nextOrder.splice(toIndex, 0, currentDraggedId);

    const previous = faqs;
    setFaqs(nextOrder.map((id) => faqs.find((faq) => faq.id === id)!));

    try {
      setFaqs(await reorderFaqs(nextOrder));
    } catch (error) {
      setFaqs(previous);
      const message =
        error instanceof ApiRequestError ? error.message : "დალაგების შენახვა ვერ მოხერხდა";
      toast.error(message);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">ხშირად დასმული კითხვები</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            გამოჩნდება საიტის საჯარო „ხშირად დასმული კითხვები” გვერდზე, ამ თანმიმდევრობით.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreateModal}
          className="shrink-0 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover"
        >
          + კითხვის დამატება
        </button>
      </div>

      <p className="mt-4 text-sm text-muted-foreground">
        გადაათრიეთ კითხვები საიტზე გამოსაჩენი თანმიმდევრობის დასალაგებლად.
      </p>

      <div className="mt-4 flex flex-col gap-3">
        {faqs.length === 0 && (
          <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            კითხვა არ არის დამატებული
          </p>
        )}

        {faqs.map((faq) => (
          <div
            key={faq.id}
            draggable
            onDragStart={() => setDraggedId(faq.id)}
            onDragOver={(event) => event.preventDefault()}
            onDrop={() => handleDrop(faq.id)}
            className="flex cursor-grab items-center gap-4 rounded-xl border border-border bg-card p-3 shadow-sm active:cursor-grabbing"
          >
            <div className="flex-1">
              <p className="font-semibold text-foreground">{faq.question.ka}</p>
            </div>

            <Toggle checked={faq.isActive} onChange={(checked) => handleToggleActive(faq, checked)} />

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => openEditModal(faq)}
                className="rounded-full px-3 py-1.5 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
              >
                რედაქტირება
              </button>
              <button
                type="button"
                onClick={() => setDeletingFaq(faq)}
                className="rounded-full px-3 py-1.5 text-sm font-semibold text-red-600 transition-colors hover:bg-red-500/10"
              >
                წაშლა
              </button>
            </div>
          </div>
        ))}
      </div>

      <FaqFormModal
        key={`${editingFaq?.id ?? "new"}-${formOpen}`}
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={() => refresh()}
        faq={editingFaq}
      />

      <ConfirmDialog
        open={deletingFaq !== null}
        onClose={() => setDeletingFaq(null)}
        title="კითხვის წაშლა"
        message={
          <>
            დარწმუნებული ხართ, რომ გსურთ წაშალოთ{" "}
            <span className="font-semibold text-foreground">{deletingFaq?.question.ka}</span>? ამ
            მოქმედების გაუქმება შეუძლებელია.
          </>
        }
        successMessage="კითხვა წაიშალა"
        onConfirm={async () => {
          if (!deletingFaq) return;
          await deleteFaq(deletingFaq.id);
          await refresh();
        }}
      />
    </div>
  );
}
