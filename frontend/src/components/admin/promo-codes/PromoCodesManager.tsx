"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Select } from "@/components/shared/Select";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { RowActions } from "@/components/shared/RowActions";
import { DataTable, type DataTableColumn } from "@/components/shared/DataTable";
import {
  deletePromoCode,
  listPromoCodes,
  type PromoCode,
  type PromoCodeDomain,
  type PromoCodeStatus,
} from "@/lib/api/promo-codes";
import type { Category } from "@/lib/api/categories";
import { ApiRequestError } from "@/lib/api/client";
import { flattenTree, isVehicleCategory } from "@/lib/categories-tree";
import { PromoCodeFormModal } from "./PromoCodeFormModal";

const STATUS_LABELS: Record<PromoCodeStatus, string> = {
  ACTIVE: "აქტიური",
  SCHEDULED: "დაგეგმილი",
  EXPIRED: "ვადაგასული",
  DISABLED: "გამორთული",
};

const STATUS_CLASSES: Record<PromoCodeStatus, string> = {
  ACTIVE: "bg-green-500/10 text-green-600",
  SCHEDULED: "bg-blue-500/10 text-blue-600",
  EXPIRED: "bg-muted text-muted-foreground",
  DISABLED: "bg-red-500/10 text-red-600",
};

function StatusBadge({ status }: { status: PromoCodeStatus }) {
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_CLASSES[status]}`}>
      {STATUS_LABELS[status]}
    </span>
  );
}

function scopeSummary(promoCode: PromoCode): string {
  if (!promoCode.category) {
    return promoCode.domain === "PRODUCT" ? "ყველა პროდუქტი" : "მთელი ტრანსპორტი";
  }

  const parts = [promoCode.category.name.ka];
  if (promoCode.productBrand) parts.push(promoCode.productBrand.name);
  if (promoCode.brand) parts.push(promoCode.brand.name);
  if (promoCode.model) parts.push(promoCode.model.name);
  if (promoCode.attribute && promoCode.attributeOption) {
    parts.push(`${promoCode.attribute.name.ka}: ${promoCode.attributeOption.label.ka}`);
  }
  if (promoCode.specFieldLabel && promoCode.specValue) {
    parts.push(`${promoCode.specFieldLabel.ka}: ${promoCode.specValue.nameKa}`);
  }
  return parts.join(" · ");
}

export function PromoCodesManager({
  domain,
  initialPromoCodes,
  categories,
}: {
  domain: PromoCodeDomain;
  initialPromoCodes: PromoCode[];
  categories: Category[];
}) {
  const [promoCodes, setPromoCodes] = useState(initialPromoCodes);
  const [statusFilter, setStatusFilter] = useState<"" | "active" | "history">("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editingPromoCode, setEditingPromoCode] = useState<PromoCode | null>(null);
  const [deletingPromoCode, setDeletingPromoCode] = useState<PromoCode | null>(null);

  const applicableCategories = useMemo(
    () =>
      domain === "VEHICLE"
        ? categories.filter((category) => isVehicleCategory(categories, category.id))
        : categories,
    [categories, domain],
  );
  const categoryFilterOptions = [
    { value: "", label: "ყველა კატეგორია" },
    ...flattenTree(applicableCategories).map((category) => ({
      value: String(category.id),
      label: `${"— ".repeat(category.depth)}${category.name.ka}`,
    })),
  ];
  const statusFilterOptions = [
    { value: "", label: "ყველა სტატუსი" },
    { value: "active", label: "აქტიური" },
    { value: "history", label: "ისტორია (დაგეგმილი/ვადაგასული/გამორთული)" },
  ];

  const columns: DataTableColumn<PromoCode>[] = [
    { header: "კოდი", render: (item) => <span className="font-mono font-semibold">{item.code}</span> },
    { header: "მოქმედების არეალი", render: scopeSummary, cellClassName: "text-muted-foreground" },
    { header: "ფასდაკლება", render: (item) => `${item.discountPercent}%`, cellClassName: "font-semibold" },
    {
      header: "გამოყენება",
      render: (item) => (item.usageLimit != null ? `${item.usageCount} / ${item.usageLimit}` : `${item.usageCount} (ულიმიტო)`),
      cellClassName: "text-muted-foreground",
    },
    {
      header: "პერიოდი",
      render: (item) => `${item.startDate.slice(0, 10)} – ${item.endDate.slice(0, 10)}`,
      cellClassName: "text-muted-foreground",
    },
    { header: "სტატუსი", render: (item) => <StatusBadge status={item.computedStatus} /> },
  ];

  async function refresh(overrides?: {
    status?: "" | "active" | "history";
    categoryId?: string;
    search?: string;
  }) {
    const status = overrides?.status ?? statusFilter;
    const categoryId = overrides?.categoryId ?? categoryFilter;
    const searchValue = overrides?.search ?? search;

    try {
      setPromoCodes(
        await listPromoCodes({
          domain,
          status: status || undefined,
          categoryId: categoryId ? Number(categoryId) : undefined,
          search: searchValue || undefined,
        }),
      );
    } catch (error) {
      const message = error instanceof ApiRequestError ? error.message : "სიის განახლება ვერ მოხერხდა";
      toast.error(message);
    }
  }

  function openCreateModal() {
    setEditingPromoCode(null);
    setFormOpen(true);
  }

  function openEditModal(promoCode: PromoCode) {
    setEditingPromoCode(promoCode);
    setFormOpen(true);
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold tracking-tight">
          {domain === "PRODUCT" ? "პროდუქტების პრომოკოდები" : "ტრანსპორტის პრომოკოდები"}
        </h2>
        <button
          type="button"
          onClick={openCreateModal}
          className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover"
        >
          + კოდის დამატება
        </button>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <input
          type="text"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          onBlur={() => refresh()}
          onKeyDown={(event) => {
            if (event.key === "Enter") refresh();
          }}
          placeholder="ძებნა კოდით (Enter)"
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
        />
        <Select
          options={categoryFilterOptions}
          value={categoryFilter}
          onChange={(value) => {
            setCategoryFilter(value);
            void refresh({ categoryId: value });
          }}
          searchable
          placeholder="ყველა კატეგორია"
          ariaLabel="კატეგორიის ფილტრი"
        />
        <Select
          options={statusFilterOptions}
          value={statusFilter}
          onChange={(value) => {
            setStatusFilter(value as "" | "active" | "history");
            void refresh({ status: value as "" | "active" | "history" });
          }}
          placeholder="ყველა სტატუსი"
          ariaLabel="სტატუსის ფილტრი"
        />
      </div>

      <div className="mt-6">
        <DataTable
          columns={columns}
          data={promoCodes}
          getRowKey={(item) => item.id}
          emptyMessage="პრომოკოდი არ არსებობს"
          actions={(item) => (
            <RowActions onEdit={() => openEditModal(item)} onDelete={() => setDeletingPromoCode(item)} />
          )}
        />
      </div>

      <PromoCodeFormModal
        key={`${editingPromoCode?.id ?? "new"}-${formOpen}`}
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={() => refresh()}
        domain={domain}
        categories={categories}
        promoCode={editingPromoCode}
      />

      <ConfirmDialog
        open={deletingPromoCode !== null}
        onClose={() => setDeletingPromoCode(null)}
        title="პრომოკოდის წაშლა"
        message={
          <>
            დარწმუნებული ხართ, რომ გსურთ წაშალოთ კოდი{" "}
            <span className="font-mono font-semibold text-foreground">{deletingPromoCode?.code}</span>?
            ამ მოქმედების გაუქმება შეუძლებელია.
          </>
        }
        successMessage="პრომოკოდი წაიშალა"
        onConfirm={async () => {
          if (!deletingPromoCode) return;
          await deletePromoCode(deletingPromoCode.id);
          await refresh();
        }}
      />
    </div>
  );
}
