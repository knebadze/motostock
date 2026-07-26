"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { deleteLookupItem, listLookupItems, type LookupItem } from "@/lib/api/lookups";
import { ApiRequestError } from "@/lib/api/client";
import { getLookupTypeLabel, type LookupTypeSlug } from "@/config/lookup-types";
import { LookupFormModal } from "./LookupFormModal";

export function LookupManager({
  type,
  initialItems,
}: {
  type: LookupTypeSlug;
  initialItems: LookupItem[];
}) {
  const [items, setItems] = useState(initialItems);
  const [formOpen, setFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<LookupItem | null>(null);
  const [deletingItem, setDeletingItem] = useState<LookupItem | null>(null);

  async function refresh() {
    try {
      setItems(await listLookupItems(type));
    } catch (error) {
      const message =
        error instanceof ApiRequestError ? error.message : "სიის განახლება ვერ მოხერხდა";
      toast.error(message);
    }
  }

  function openCreateModal() {
    setEditingItem(null);
    setFormOpen(true);
  }

  function openEditModal(item: LookupItem) {
    setEditingItem(item);
    setFormOpen(true);
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">{getLookupTypeLabel(type)}</h1>
        <button
          type="button"
          onClick={openCreateModal}
          className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover"
        >
          + დამატება
        </button>
      </div>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-border">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Key</th>
              <th className="px-4 py-3 font-medium">სახელი (KA)</th>
              <th className="px-4 py-3 font-medium">სახელი (EN)</th>
              <th className="px-4 py-3 font-medium">სახელი (RU)</th>
              <th className="px-4 py-3 font-medium text-right">მოქმედება</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                  ჩანაწერი არ არსებობს
                </td>
              </tr>
            )}
            {items.map((item) => (
              <tr key={item.id} className="border-b border-border last:border-0">
                <td className="px-4 py-3 font-mono text-muted-foreground">{item.key}</td>
                <td className="px-4 py-3">{item.nameKa}</td>
                <td className="px-4 py-3 text-muted-foreground">{item.nameEn}</td>
                <td className="px-4 py-3 text-muted-foreground">{item.nameRu}</td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1">
                    <button
                      type="button"
                      onClick={() => openEditModal(item)}
                      aria-label="რედაქტირება"
                      title="რედაქტირება"
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
                        <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeletingItem(item)}
                      aria-label="წაშლა"
                      title="წაშლა"
                      className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-red-600"
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
                        <path d="M3 6h18" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                        <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        <line x1="10" y1="11" x2="10" y2="17" />
                        <line x1="14" y1="11" x2="14" y2="17" />
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <LookupFormModal
        key={`${editingItem?.id ?? "new"}-${formOpen}`}
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={refresh}
        type={type}
        item={editingItem}
      />

      <ConfirmDialog
        open={deletingItem !== null}
        onClose={() => setDeletingItem(null)}
        title="ჩანაწერის წაშლა"
        message={
          <>
            დარწმუნებული ხართ, რომ გსურთ წაშალოთ{" "}
            <span className="font-semibold text-foreground">{deletingItem?.nameKa}</span>?
            ამ მოქმედების გაუქმება შეუძლებელია.
          </>
        }
        successMessage="ჩანაწერი წაიშალა"
        onConfirm={async () => {
          if (!deletingItem) return;
          await deleteLookupItem(type, deletingItem.id);
          await refresh();
        }}
      />
    </div>
  );
}
