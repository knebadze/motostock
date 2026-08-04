"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { RowActions } from "@/components/shared/RowActions";
import { DataTable, type DataTableColumn } from "@/components/shared/DataTable";
import { deleteUnit, listUnits, type Unit } from "@/lib/api/units";
import { ApiRequestError } from "@/lib/api/client";
import { UnitFormModal } from "./UnitFormModal";

const columns: DataTableColumn<Unit>[] = [
  { header: "სახელი", render: (unit) => unit.name.ka },
  {
    header: "აბრევიატურა",
    render: (unit) => `${unit.abbreviation.ka} / ${unit.abbreviation.en} / ${unit.abbreviation.ru}`,
    cellClassName: "font-mono text-muted-foreground",
  },
];

export function UnitsManager({ initialUnits }: { initialUnits: Unit[] }) {
  const [units, setUnits] = useState(initialUnits);
  const [formOpen, setFormOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);
  const [deletingUnit, setDeletingUnit] = useState<Unit | null>(null);

  async function refresh() {
    try {
      setUnits(await listUnits());
    } catch (error) {
      const message =
        error instanceof ApiRequestError ? error.message : "სიის განახლება ვერ მოხერხდა";
      toast.error(message);
    }
  }

  function openCreateModal() {
    setEditingUnit(null);
    setFormOpen(true);
  }

  function openEditModal(unit: Unit) {
    setEditingUnit(unit);
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
          + ერთეულის დამატება
        </button>
      </div>

      <div className="mt-6">
        <DataTable
          columns={columns}
          data={units}
          getRowKey={(unit) => unit.id}
          emptyMessage="ერთეული არ არსებობს"
          actions={(unit) => (
            <RowActions
              onEdit={() => openEditModal(unit)}
              onDelete={() => setDeletingUnit(unit)}
            />
          )}
        />
      </div>

      <UnitFormModal
        key={`${editingUnit?.id ?? "new"}-${formOpen}`}
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={() => refresh()}
        unit={editingUnit}
      />

      <ConfirmDialog
        open={deletingUnit !== null}
        onClose={() => setDeletingUnit(null)}
        title="ერთეულის წაშლა"
        message={
          <>
            დარწმუნებული ხართ, რომ გსურთ წაშალოთ{" "}
            <span className="font-semibold text-foreground">{deletingUnit?.name.ka}</span>? ამ
            მოქმედების გაუქმება შეუძლებელია.
          </>
        }
        successMessage="ერთეული წაიშალა"
        onConfirm={async () => {
          if (!deletingUnit) return;
          await deleteUnit(deletingUnit.id);
          await refresh();
        }}
      />
    </div>
  );
}
