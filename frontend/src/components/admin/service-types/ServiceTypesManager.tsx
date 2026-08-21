"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { Toggle } from "@/components/shared/Toggle";
import {
  deleteServiceType,
  listServiceTypes,
  reorderServiceTypes,
  updateServiceType,
  type ServiceType,
} from "@/lib/api/service-types";
import { ApiRequestError } from "@/lib/api/client";
import { formatPrice } from "@/lib/format";
import { ServiceTypeFormModal } from "./ServiceTypeFormModal";

export function ServiceTypesManager({ initialServiceTypes }: { initialServiceTypes: ServiceType[] }) {
  const [serviceTypes, setServiceTypes] = useState(initialServiceTypes);
  const [formOpen, setFormOpen] = useState(false);
  const [editingServiceType, setEditingServiceType] = useState<ServiceType | null>(null);
  const [deletingServiceType, setDeletingServiceType] = useState<ServiceType | null>(null);
  const [draggedId, setDraggedId] = useState<number | null>(null);

  async function refresh() {
    try {
      setServiceTypes(await listServiceTypes());
    } catch (error) {
      const message =
        error instanceof ApiRequestError ? error.message : "სიის განახლება ვერ მოხერხდა";
      toast.error(message);
    }
  }

  function openCreateModal() {
    setEditingServiceType(null);
    setFormOpen(true);
  }

  function openEditModal(serviceType: ServiceType) {
    setEditingServiceType(serviceType);
    setFormOpen(true);
  }

  async function handleToggleActive(serviceType: ServiceType, isActive: boolean) {
    const previous = serviceTypes;
    setServiceTypes((current) =>
      current.map((item) => (item.id === serviceType.id ? { ...item, isActive } : item)),
    );
    try {
      await updateServiceType(serviceType.id, { isActive });
    } catch (error) {
      setServiceTypes(previous);
      const message = error instanceof ApiRequestError ? error.message : "განახლება ვერ მოხერხდა";
      toast.error(message);
    }
  }

  async function handleDrop(targetId: number) {
    const currentDraggedId = draggedId;
    setDraggedId(null);
    if (currentDraggedId === null || currentDraggedId === targetId) return;

    const order = serviceTypes.map((item) => item.id);
    const fromIndex = order.indexOf(currentDraggedId);
    const toIndex = order.indexOf(targetId);
    const nextOrder = [...order];
    nextOrder.splice(fromIndex, 1);
    nextOrder.splice(toIndex, 0, currentDraggedId);

    const previous = serviceTypes;
    setServiceTypes(nextOrder.map((id) => serviceTypes.find((item) => item.id === id)!));

    try {
      setServiceTypes(await reorderServiceTypes(nextOrder));
    } catch (error) {
      setServiceTypes(previous);
      const message =
        error instanceof ApiRequestError ? error.message : "დალაგების შენახვა ვერ მოხერხდა";
      toast.error(message);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight">სერვისების ტიპები</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            სახელოსნოში ჩატარებული სერვისის ისტორიის ჩასაწერად გამოსაყენებელი შაბლონები (მაგ. ზეთის
            შეცვლა, სამუხრუჭე ხუნდების შეცვლა).
          </p>
        </div>
        <button
          type="button"
          onClick={openCreateModal}
          className="shrink-0 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover"
        >
          + სერვისის ტიპის დამატება
        </button>
      </div>

      <p className="mt-4 text-sm text-muted-foreground">
        გადაათრიეთ სერვისები სერვისის ისტორიის ფორმაში გამოსაჩენი თანმიმდევრობის დასალაგებლად.
      </p>

      <div className="mt-4 flex flex-col gap-3">
        {serviceTypes.length === 0 && (
          <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            სერვისის ტიპი არ არის დამატებული
          </p>
        )}

        {serviceTypes.map((serviceType) => (
          <div
            key={serviceType.id}
            draggable
            onDragStart={() => setDraggedId(serviceType.id)}
            onDragOver={(event) => event.preventDefault()}
            onDrop={() => handleDrop(serviceType.id)}
            className="flex cursor-grab items-center gap-4 rounded-xl border border-border bg-card p-3 shadow-sm active:cursor-grabbing"
          >
            <div className="flex-1">
              <p className="font-semibold text-foreground">
                {serviceType.name.ka}
                {serviceType.defaultPrice != null && (
                  <span className="ml-2 font-normal text-muted-foreground">
                    {formatPrice(serviceType.defaultPrice)}
                  </span>
                )}
              </p>
              {(serviceType.hasPositionOption || serviceType.hasFilterOption) && (
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {[
                    serviceType.hasPositionOption ? "პოზიცია (წინა/უკანა/ორივე)" : null,
                    serviceType.hasFilterOption ? "ფილტრიც შეიცვალა? (კი/არა)" : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              )}
            </div>

            <Toggle
              checked={serviceType.isActive}
              onChange={(checked) => handleToggleActive(serviceType, checked)}
            />

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => openEditModal(serviceType)}
                className="rounded-full px-3 py-1.5 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
              >
                რედაქტირება
              </button>
              <button
                type="button"
                onClick={() => setDeletingServiceType(serviceType)}
                className="rounded-full px-3 py-1.5 text-sm font-semibold text-red-600 transition-colors hover:bg-red-500/10"
              >
                წაშლა
              </button>
            </div>
          </div>
        ))}
      </div>

      <ServiceTypeFormModal
        key={`${editingServiceType?.id ?? "new"}-${formOpen}`}
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={() => refresh()}
        serviceType={editingServiceType}
      />

      <ConfirmDialog
        open={deletingServiceType !== null}
        onClose={() => setDeletingServiceType(null)}
        title="სერვისის ტიპის წაშლა"
        message={
          <>
            დარწმუნებული ხართ, რომ გსურთ წაშალოთ{" "}
            <span className="font-semibold text-foreground">{deletingServiceType?.name.ka}</span>?
            ამ მოქმედების გაუქმება შეუძლებელია.
          </>
        }
        successMessage="სერვისის ტიპი წაიშალა"
        onConfirm={async () => {
          if (!deletingServiceType) return;
          await deleteServiceType(deletingServiceType.id);
          await refresh();
        }}
      />
    </div>
  );
}
