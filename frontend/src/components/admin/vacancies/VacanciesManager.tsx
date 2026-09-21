"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { RowActions } from "@/components/shared/RowActions";
import { DataTable, type DataTableColumn } from "@/components/shared/DataTable";
import { Toggle } from "@/components/shared/Toggle";
import { useOptimisticToggle } from "@/components/shared/useOptimisticToggle";
import { deleteVacancy, listVacancies, updateVacancy, type Vacancy } from "@/lib/api/vacancies";
import { ApiRequestError } from "@/lib/api/client";
import { VacancyFormModal } from "./VacancyFormModal";

export function VacanciesManager({ initialVacancies }: { initialVacancies: Vacancy[] }) {
  const [vacancies, setVacancies] = useState(initialVacancies);
  const [formOpen, setFormOpen] = useState(false);
  const [editingVacancy, setEditingVacancy] = useState<Vacancy | null>(null);
  const [deletingVacancy, setDeletingVacancy] = useState<Vacancy | null>(null);

  async function refresh() {
    try {
      setVacancies(await listVacancies());
    } catch (error) {
      const message =
        error instanceof ApiRequestError ? error.message : "სიის განახლება ვერ მოხერხდა";
      toast.error(message);
    }
  }

  function openCreateModal() {
    setEditingVacancy(null);
    setFormOpen(true);
  }

  function openEditModal(vacancy: Vacancy) {
    setEditingVacancy(vacancy);
    setFormOpen(true);
  }

  const handleToggleActive = useOptimisticToggle(vacancies, setVacancies, updateVacancy);

  const columns: DataTableColumn<Vacancy>[] = [
    { header: "სათაური", render: (item) => <span className="font-semibold">{item.title.ka}</span> },
    { header: "Slug", render: (item) => item.slug, cellClassName: "font-mono text-muted-foreground" },
    {
      header: "სტატუსი",
      render: (item) => (
        <Toggle
          checked={item.isActive}
          onChange={(checked) => handleToggleActive(item, checked)}
          label={`${item.title.ka} — აქტიურობა`}
        />
      ),
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">ვაკანსიები</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            გამოჩნდება საიტის საჯარო „ვაკანსიები” გვერდზე, უახლესი პირველ ადგილას.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreateModal}
          className="shrink-0 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover"
        >
          + ვაკანსიის დამატება
        </button>
      </div>

      <div className="mt-6">
        <DataTable
          columns={columns}
          data={vacancies}
          getRowKey={(item) => item.id}
          emptyMessage="ვაკანსია არ არის დამატებული"
          actions={(item) => (
            <RowActions
              onView={() => window.open(`/vacancies/${item.slug}`, "_blank")}
              onEdit={() => openEditModal(item)}
              onDelete={() => setDeletingVacancy(item)}
            />
          )}
        />
      </div>

      <VacancyFormModal
        key={`${editingVacancy?.id ?? "new"}-${formOpen}`}
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={() => refresh()}
        vacancy={editingVacancy}
      />

      <ConfirmDialog
        open={deletingVacancy !== null}
        onClose={() => setDeletingVacancy(null)}
        title="ვაკანსიის წაშლა"
        message={
          <>
            დარწმუნებული ხართ, რომ გსურთ წაშალოთ{" "}
            <span className="font-semibold text-foreground">{deletingVacancy?.title.ka}</span>? ამ
            მოქმედების გაუქმება შეუძლებელია.
          </>
        }
        successMessage="ვაკანსია წაიშალა"
        onConfirm={async () => {
          if (!deletingVacancy) return;
          await deleteVacancy(deletingVacancy.id);
          await refresh();
        }}
      />
    </div>
  );
}
