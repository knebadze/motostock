"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { DataTable, type DataTableColumn } from "@/components/shared/DataTable";
import {
  deleteOrderStatus,
  listOrderStatuses,
  updateOrderStatusItem,
  type OrderStatusItem,
} from "@/lib/api/order-statuses";
import { ApiRequestError } from "@/lib/api/client";
import { OrderStatusFormModal } from "./OrderStatusFormModal";

function MoveButtons({
  isFirst,
  isLast,
  onMove,
}: {
  isFirst: boolean;
  isLast: boolean;
  onMove: (direction: "up" | "down") => void;
}) {
  return (
    <div className="flex flex-col">
      <button
        type="button"
        onClick={() => onMove("up")}
        disabled={isFirst}
        aria-label="ზემოთ აწევა"
        className="rounded p-0.5 text-muted-foreground transition-colors hover:text-primary disabled:opacity-30"
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
          <path d="m18 15-6-6-6 6" />
        </svg>
      </button>
      <button
        type="button"
        onClick={() => onMove("down")}
        disabled={isLast}
        aria-label="ქვემოთ ჩამოწევა"
        className="rounded p-0.5 text-muted-foreground transition-colors hover:text-primary disabled:opacity-30"
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
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
    </div>
  );
}

export function OrderStatusesManager({ initialItems }: { initialItems: OrderStatusItem[] }) {
  const [items, setItems] = useState([...initialItems].sort((a, b) => a.sortOrder - b.sortOrder));
  const [formOpen, setFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<OrderStatusItem | null>(null);
  const [deletingItem, setDeletingItem] = useState<OrderStatusItem | null>(null);

  async function refresh() {
    try {
      setItems((await listOrderStatuses()).sort((a, b) => a.sortOrder - b.sortOrder));
    } catch (error) {
      const message = error instanceof ApiRequestError ? error.message : "სიის განახლება ვერ მოხერხდა";
      toast.error(message);
    }
  }

  async function handleMove(item: OrderStatusItem, direction: "up" | "down") {
    const index = items.findIndex((i) => i.id === item.id);
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= items.length) return;
    const target = items[targetIndex];

    const previous = items;
    const reordered = [...items];
    reordered[index] = { ...target, sortOrder: item.sortOrder };
    reordered[targetIndex] = { ...item, sortOrder: target.sortOrder };
    setItems(reordered.sort((a, b) => a.sortOrder - b.sortOrder));

    try {
      await Promise.all([
        updateOrderStatusItem(item.id, { sortOrder: target.sortOrder }),
        updateOrderStatusItem(target.id, { sortOrder: item.sortOrder }),
      ]);
    } catch (error) {
      setItems(previous);
      const message =
        error instanceof ApiRequestError ? error.message : "დალაგების შენახვა ვერ მოხერხდა";
      toast.error(message);
    }
  }

  function openCreateModal() {
    setEditingItem(null);
    setFormOpen(true);
  }

  function openEditModal(item: OrderStatusItem) {
    setEditingItem(item);
    setFormOpen(true);
  }

  const columns: DataTableColumn<OrderStatusItem>[] = [
    {
      header: "",
      render: (item) => {
        const index = items.findIndex((i) => i.id === item.id);
        return (
          <MoveButtons
            isFirst={index === 0}
            isLast={index === items.length - 1}
            onMove={(direction) => handleMove(item, direction)}
          />
        );
      },
    },
    { header: "Key", render: (item) => item.key, cellClassName: "font-mono text-muted-foreground" },
    { header: "სახელი (KA)", render: (item) => item.nameKa },
    { header: "სახელი (EN)", render: (item) => item.nameEn, cellClassName: "text-muted-foreground" },
    { header: "სახელი (RU)", render: (item) => item.nameRu, cellClassName: "text-muted-foreground" },
  ];

  return (
    <div>
      <p className="text-sm text-muted-foreground">
        თანმიმდევრობა (ისრებით) განსაზღვრავს, რა რიგით გამოჩნდება სტატუსი შეკვეთების გვერდის
        სტატუსის ჩამონათვალში.
      </p>

      <div className="mt-3 flex items-center justify-end">
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
          emptyMessage="სტატუსი არ არსებობს"
          actions={(item) => (
            <div className="flex justify-end gap-1">
              <button
                type="button"
                onClick={() => openEditModal(item)}
                className="rounded-lg px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-primary"
              >
                რედაქტირება
              </button>
              <button
                type="button"
                onClick={() => setDeletingItem(item)}
                className="rounded-lg px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-red-600"
              >
                წაშლა
              </button>
            </div>
          )}
        />
      </div>

      <OrderStatusFormModal
        key={`${editingItem?.id ?? "new"}-${formOpen}`}
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={refresh}
        item={editingItem}
      />

      <ConfirmDialog
        open={deletingItem !== null}
        onClose={() => setDeletingItem(null)}
        title="სტატუსის წაშლა"
        message={
          <>
            დარწმუნებული ხართ, რომ გსურთ წაშალოთ{" "}
            <span className="font-semibold text-foreground">{deletingItem?.nameKa}</span>? ამ
            მოქმედების გაუქმება შეუძლებელია.
          </>
        }
        successMessage="სტატუსი წაიშალა"
        onConfirm={async () => {
          if (!deletingItem) return;
          await deleteOrderStatus(deletingItem.id);
          await refresh();
        }}
      />
    </div>
  );
}
