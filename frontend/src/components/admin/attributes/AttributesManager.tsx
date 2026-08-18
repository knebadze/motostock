"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Select } from "@/components/shared/Select";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { RowActions } from "@/components/shared/RowActions";
import { DataTable, type DataTableColumn } from "@/components/shared/DataTable";
import { deleteAttribute, listAttributes, type Attribute } from "@/lib/api/attributes";
import type { Category } from "@/lib/api/categories";
import type { Unit } from "@/lib/api/units";
import { ApiRequestError } from "@/lib/api/client";
import { flattenTree } from "@/lib/categories-tree";
import { AttributeFormModal } from "./AttributeFormModal";

const VALUE_TYPE_LABELS: Record<Attribute["valueType"], string> = {
  TEXT: "ტექსტი",
  NUMBER: "რიცხვი",
  BOOLEAN: "დიახ/არა",
  SELECT: "არჩევანი (სია)",
};

const columns: DataTableColumn<Attribute>[] = [
  { header: "სახელი", render: (attribute) => attribute.name.ka },
  {
    header: "კატეგორია",
    render: (attribute) => attribute.category.name.ka,
    cellClassName: "text-muted-foreground",
  },
  {
    header: "ტიპი",
    render: (attribute) => VALUE_TYPE_LABELS[attribute.valueType],
    cellClassName: "text-muted-foreground",
  },
  {
    header: "სავალდებულო",
    render: (attribute) => (attribute.required ? "დიახ" : "არა"),
    cellClassName: "text-muted-foreground",
  },
  {
    header: "ერთეული",
    render: (attribute) => attribute.unit?.abbreviation.ka ?? "—",
    cellClassName: "text-muted-foreground",
  },
];

export function AttributesManager({
  initialAttributes,
  categories,
  units,
}: {
  initialAttributes: Attribute[];
  categories: Category[];
  units: Unit[];
}) {
  const [attributes, setAttributes] = useState(initialAttributes);
  const [categoryFilter, setCategoryFilter] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editingAttribute, setEditingAttribute] = useState<Attribute | null>(null);
  const [deletingAttribute, setDeletingAttribute] = useState<Attribute | null>(null);

  const categoryFilterOptions = [
    { value: "", label: "ყველა კატეგორია" },
    ...flattenTree(categories).map((category) => ({
      value: String(category.id),
      label: `${"— ".repeat(category.depth)}${category.name.ka}`,
    })),
  ];

  async function refresh(nextFilter?: string) {
    const filter = nextFilter ?? categoryFilter;
    try {
      setAttributes(await listAttributes(filter ? Number(filter) : undefined));
    } catch (error) {
      const message =
        error instanceof ApiRequestError ? error.message : "სიის განახლება ვერ მოხერხდა";
      toast.error(message);
    }
  }

  async function handleFilterChange(value: string) {
    setCategoryFilter(value);
    await refresh(value);
  }

  function openCreateModal() {
    setEditingAttribute(null);
    setFormOpen(true);
  }

  function openEditModal(attribute: Attribute) {
    setEditingAttribute(attribute);
    setFormOpen(true);
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">მახასიათებლები</h1>
        <button
          type="button"
          onClick={openCreateModal}
          disabled={categories.length === 0}
          className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover disabled:opacity-50"
        >
          + მახასიათებლის დამატება
        </button>
      </div>

      {categories.length === 0 && (
        <p className="mt-2 text-sm text-muted-foreground">
          მახასიათებლის დასამატებლად ჯერ საჭიროა მინიმუმ ერთი კატეგორიის შექმნა.
        </p>
      )}

      <div className="mt-4 w-72">
        <Select
          options={categoryFilterOptions}
          value={categoryFilter}
          onChange={handleFilterChange}
          searchable
          placeholder="ყველა კატეგორია"
          ariaLabel="კატეგორიის ფილტრი"
        />
      </div>

      <div className="mt-6">
        <DataTable
          columns={columns}
          data={attributes}
          getRowKey={(attribute) => attribute.id}
          emptyMessage="მახასიათებელი არ არსებობს"
          actions={(attribute) => (
            <RowActions
              onEdit={() => openEditModal(attribute)}
              onDelete={() => setDeletingAttribute(attribute)}
            />
          )}
        />
      </div>

      <AttributeFormModal
        key={`${editingAttribute?.id ?? "new"}-${formOpen}`}
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={() => refresh()}
        categories={categories}
        units={units}
        attribute={editingAttribute}
      />

      <ConfirmDialog
        open={deletingAttribute !== null}
        onClose={() => setDeletingAttribute(null)}
        title="მახასიათებლის წაშლა"
        message={
          <>
            დარწმუნებული ხართ, რომ გსურთ წაშალოთ{" "}
            <span className="font-semibold text-foreground">{deletingAttribute?.name.ka}</span>?
            ამ მოქმედების გაუქმება შეუძლებელია.
          </>
        }
        successMessage="მახასიათებელი წაიშალა"
        onConfirm={async () => {
          if (!deletingAttribute) return;
          await deleteAttribute(deletingAttribute.id);
          await refresh();
        }}
      />
    </div>
  );
}
