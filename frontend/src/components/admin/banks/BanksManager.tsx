"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { Toggle } from "@/components/shared/Toggle";
import { deleteBank, listBanks, reorderBanks, updateBank, type Bank } from "@/lib/api/banks";
import { ApiRequestError, resolveMediaUrl } from "@/lib/api/client";
import { BankFormModal } from "./BankFormModal";

export function BanksManager({ initialBanks }: { initialBanks: Bank[] }) {
  const [banks, setBanks] = useState(initialBanks);
  const [formOpen, setFormOpen] = useState(false);
  const [editingBank, setEditingBank] = useState<Bank | null>(null);
  const [deletingBank, setDeletingBank] = useState<Bank | null>(null);
  const [draggedId, setDraggedId] = useState<number | null>(null);

  async function refresh() {
    try {
      setBanks(await listBanks());
    } catch (error) {
      const message =
        error instanceof ApiRequestError ? error.message : "სიის განახლება ვერ მოხერხდა";
      toast.error(message);
    }
  }

  function openCreateModal() {
    setEditingBank(null);
    setFormOpen(true);
  }

  function openEditModal(bank: Bank) {
    setEditingBank(bank);
    setFormOpen(true);
  }

  async function handleToggleActive(bank: Bank, isActive: boolean) {
    const previous = banks;
    setBanks((current) => current.map((b) => (b.id === bank.id ? { ...b, isActive } : b)));
    try {
      await updateBank(bank.id, { isActive });
    } catch (error) {
      setBanks(previous);
      const message = error instanceof ApiRequestError ? error.message : "განახლება ვერ მოხერხდა";
      toast.error(message);
    }
  }

  async function handleDrop(targetId: number) {
    const currentDraggedId = draggedId;
    setDraggedId(null);
    if (currentDraggedId === null || currentDraggedId === targetId) return;

    const order = banks.map((bank) => bank.id);
    const fromIndex = order.indexOf(currentDraggedId);
    const toIndex = order.indexOf(targetId);
    const nextOrder = [...order];
    nextOrder.splice(fromIndex, 1);
    nextOrder.splice(toIndex, 0, currentDraggedId);

    const previous = banks;
    setBanks(nextOrder.map((id) => banks.find((bank) => bank.id === id)!));

    try {
      setBanks(await reorderBanks(nextOrder));
    } catch (error) {
      setBanks(previous);
      const message =
        error instanceof ApiRequestError ? error.message : "დალაგების შენახვა ვერ მოხერხდა";
      toast.error(message);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight">ბანკები</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            შეკვეთის გაფორმებისას ბარათით გადახდის არჩევისას მომხმარებელი ამ სიიდან ირჩევს ბანკს.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreateModal}
          className="shrink-0 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover"
        >
          + ბანკის დამატება
        </button>
      </div>

      <p className="mt-4 text-sm text-muted-foreground">
        გადაათრიეთ ბანკები checkout-ზე გამოსაჩენი თანმიმდევრობის დასალაგებლად.
      </p>

      <div className="mt-4 flex flex-col gap-3">
        {banks.length === 0 && (
          <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            ბანკი არ არის დამატებული
          </p>
        )}

        {banks.map((bank) => {
          const logoUrl = resolveMediaUrl(bank.logoUrl);
          return (
            <div
              key={bank.id}
              draggable
              onDragStart={() => setDraggedId(bank.id)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => handleDrop(bank.id)}
              className="flex cursor-grab items-center gap-4 rounded-xl border border-border bg-card p-3 shadow-sm active:cursor-grabbing"
            >
              <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted">
                {logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={logoUrl} alt="" className="size-full object-contain p-1" />
                ) : (
                  <div className="size-full border border-dashed border-border" />
                )}
              </div>

              <div className="flex-1">
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-mono font-medium text-muted-foreground">
                  {bank.key}
                </span>
                <p className="mt-1 font-semibold text-foreground">{bank.name.ka}</p>
                {(bank.supportsInstallment || bank.supportsSplitPayment) && (
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {[
                      bank.supportsInstallment ? "განვადება" : null,
                      bank.supportsSplitPayment ? "ნაწილ-ნაწილ გადახდა" : null,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                )}
              </div>

              <Toggle checked={bank.isActive} onChange={(checked) => handleToggleActive(bank, checked)} />

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => openEditModal(bank)}
                  className="rounded-full px-3 py-1.5 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
                >
                  რედაქტირება
                </button>
                <button
                  type="button"
                  onClick={() => setDeletingBank(bank)}
                  className="rounded-full px-3 py-1.5 text-sm font-semibold text-red-600 transition-colors hover:bg-red-500/10"
                >
                  წაშლა
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <BankFormModal
        key={`${editingBank?.id ?? "new"}-${formOpen}`}
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={() => refresh()}
        bank={editingBank}
      />

      <ConfirmDialog
        open={deletingBank !== null}
        onClose={() => setDeletingBank(null)}
        title="ბანკის წაშლა"
        message={
          <>
            დარწმუნებული ხართ, რომ გსურთ წაშალოთ{" "}
            <span className="font-semibold text-foreground">{deletingBank?.name.ka}</span>? ამ
            მოქმედების გაუქმება შეუძლებელია.
          </>
        }
        successMessage="ბანკი წაიშალა"
        onConfirm={async () => {
          if (!deletingBank) return;
          await deleteBank(deletingBank.id);
          await refresh();
        }}
      />
    </div>
  );
}
