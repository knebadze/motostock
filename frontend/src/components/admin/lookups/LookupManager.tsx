"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { RowActions } from "@/components/shared/RowActions";
import { DataTable, type DataTableColumn } from "@/components/shared/DataTable";
import { deleteLookupItem, listLookupItems, type LookupItem } from "@/lib/api/lookups";
import { ApiRequestError } from "@/lib/api/client";
import type { LookupTypeSlug } from "@/config/lookup-types";
import { LookupFormModal } from "./LookupFormModal";

const columns: DataTableColumn<LookupItem>[] = [
  { header: "Key", render: (item) => item.key, cellClassName: "font-mono text-muted-foreground" },
  { header: "სახელი (KA)", render: (item) => item.nameKa },
  { header: "სახელი (EN)", render: (item) => item.nameEn, cellClassName: "text-muted-foreground" },
  { header: "სახელი (RU)", render: (item) => item.nameRu, cellClassName: "text-muted-foreground" },
];

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
      <div className="flex items-center justify-end">
        <button
          type="button"
          onClick={openCreateModal}
          className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover"
        >
          + დამატება
        </button>
      </div>

      <div className="mt-6">
        <DataTable
          columns={columns}
          data={items}
          getRowKey={(item) => item.id}
          emptyMessage="ჩანაწერი არ არსებობს"
          actions={(item) => (
            <RowActions
              onEdit={() => openEditModal(item)}
              onDelete={() => setDeletingItem(item)}
            />
          )}
        />
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
