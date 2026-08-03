"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Select } from "@/components/shared/Select";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { DataTable, type DataTableColumn } from "@/components/shared/DataTable";
import {
  createVehicleCategoryFilter,
  deleteVehicleCategoryFilter,
  listVehicleCategoryFilters,
  updateVehicleCategoryFilterSortOrder,
  type VehicleCategoryFilter,
  type VehicleCategoryFilterType,
  type VehicleSpecField,
} from "@/lib/api/vehicle-category-filters";
import type { Category } from "@/lib/api/categories";
import { ApiRequestError } from "@/lib/api/client";
import { flattenTree, isVehicleCategory } from "@/lib/categories-tree";
import { VEHICLE_SPEC_FIELDS, getVehicleSpecFieldLabel } from "@/config/vehicle-spec-fields";

const FILTER_TYPE_OPTIONS: { value: VehicleCategoryFilterType; label: string }[] = [
  { value: "PRICE", label: "ფასი" },
  { value: "YEAR", label: "წელი" },
  { value: "BRAND", label: "ბრენდი" },
  { value: "SPEC", label: "ტექნიკური მახასიათებელი" },
];

function filterLabel(filter: VehicleCategoryFilter): string {
  if (filter.filterType === "PRICE") return "ფასი";
  if (filter.filterType === "YEAR") return "წელი";
  if (filter.filterType === "BRAND") return "ბრენდი";
  return filter.specFieldLabel?.ka ?? (filter.specField ? getVehicleSpecFieldLabel(filter.specField) : "მახასიათებელი");
}

export function VehicleCategoryFiltersManager({ categories }: { categories: Category[] }) {
  const vehicleCategories = categories.filter((category) => isVehicleCategory(categories, category.id));

  const [categoryId, setCategoryId] = useState("");
  const [filters, setFilters] = useState<VehicleCategoryFilter[]>([]);
  const [loading, setLoading] = useState(false);
  const [newFilterType, setNewFilterType] = useState<string>("");
  const [newSpecField, setNewSpecField] = useState("");
  const [adding, setAdding] = useState(false);
  const [deletingFilter, setDeletingFilter] = useState<VehicleCategoryFilter | null>(null);

  const categoryOptions = flattenTree(vehicleCategories).map((category) => ({
    value: String(category.id),
    label: `${"— ".repeat(category.depth)}${category.name.ka}`,
  }));

  async function loadForCategory(id: string) {
    if (!id) {
      setFilters([]);
      return;
    }
    setLoading(true);
    try {
      setFilters(await listVehicleCategoryFilters(Number(id)));
    } catch (error) {
      const message =
        error instanceof ApiRequestError ? error.message : "ჩატვირთვა ვერ მოხერხდა";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  async function handleCategoryChange(value: string) {
    setCategoryId(value);
    setNewFilterType("");
    setNewSpecField("");
    await loadForCategory(value);
  }

  const usedSpecFields = new Set(filters.filter((f) => f.specField).map((f) => f.specField));
  const hasPriceFilter = filters.some((f) => f.filterType === "PRICE");
  const hasYearFilter = filters.some((f) => f.filterType === "YEAR");
  const hasBrandFilter = filters.some((f) => f.filterType === "BRAND");
  const availableSpecFields = VEHICLE_SPEC_FIELDS.filter((item) => !usedSpecFields.has(item.field));

  const filterTypeOptions = FILTER_TYPE_OPTIONS.filter((option) => {
    if (option.value === "PRICE") return !hasPriceFilter;
    if (option.value === "YEAR") return !hasYearFilter;
    if (option.value === "BRAND") return !hasBrandFilter;
    return availableSpecFields.length > 0;
  });

  const specFieldOptions = availableSpecFields.map((item) => ({
    value: item.field,
    label: item.label,
  }));

  async function handleAddFilter() {
    if (!categoryId || !newFilterType) return;
    if (newFilterType === "SPEC" && !newSpecField) {
      toast.error("აირჩიეთ მახასიათებელი");
      return;
    }

    setAdding(true);
    try {
      const maxSortOrder = filters.reduce((max, filter) => Math.max(max, filter.sortOrder), -1);
      await createVehicleCategoryFilter({
        categoryId: Number(categoryId),
        filterType: newFilterType as VehicleCategoryFilterType,
        specField: newFilterType === "SPEC" ? (newSpecField as VehicleSpecField) : undefined,
        sortOrder: maxSortOrder + 1,
      });
      toast.success("ფილტრი დაემატა");
      setNewFilterType("");
      setNewSpecField("");
      await loadForCategory(categoryId);
    } catch (error) {
      const message = error instanceof ApiRequestError ? error.message : "დამატება ვერ მოხერხდა";
      toast.error(message);
    } finally {
      setAdding(false);
    }
  }

  function handleSortOrderInput(filterId: number, value: string) {
    const sortOrder = Number(value);
    if (Number.isNaN(sortOrder)) return;
    setFilters((current) =>
      current.map((filter) => (filter.id === filterId ? { ...filter, sortOrder } : filter)),
    );
  }

  async function handleSortOrderCommit(filterId: number, value: number) {
    try {
      await updateVehicleCategoryFilterSortOrder(filterId, value);
      await loadForCategory(categoryId);
    } catch (error) {
      const message = error instanceof ApiRequestError ? error.message : "დალაგება ვერ განახლდა";
      toast.error(message);
      await loadForCategory(categoryId);
    }
  }

  const columns: DataTableColumn<VehicleCategoryFilter>[] = [
    { header: "ფილტრი", render: (filter) => filterLabel(filter) },
    {
      header: "ტიპი",
      render: (filter) => (filter.filterType === "SPEC" ? filter.specFieldKind ?? "" : filter.filterType),
      cellClassName: "text-muted-foreground",
    },
    {
      header: "წარმომავლობა",
      render: (filter) =>
        String(filter.category.id) === categoryId ? (
          "პირდაპირ"
        ) : (
          <span title="ეს ფილტრი მემკვიდრეობით მოდის მშობელი კატეგორიიდან — წაშლა/დალაგება იმ კატეგორიაზეც აისახება">
            მემკვიდრეობით: {filter.category.name.ka}
          </span>
        ),
      cellClassName: "text-muted-foreground",
    },
    {
      header: "დალაგება",
      render: (filter) => (
        <input
          type="number"
          value={filter.sortOrder}
          onChange={(event) => handleSortOrderInput(filter.id, event.target.value)}
          onBlur={(event) => handleSortOrderCommit(filter.id, Number(event.target.value))}
          className="w-20 rounded-lg border border-border bg-background px-2 py-1 text-sm outline-none focus:border-primary"
        />
      ),
    },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">ტრანსპორტის ფილტრები</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        აირჩიეთ ტრანსპორტის კატეგორია და აწყვეთ, რომელი ფილტრები გამოჩნდეს შოპში ამ კატეგორიისთვის
        და რა თანმიმდევრობით.
      </p>

      <div className="mt-4 w-72">
        <Select
          options={categoryOptions}
          value={categoryId}
          onChange={handleCategoryChange}
          searchable
          placeholder="აირჩიეთ კატეგორია"
        />
      </div>

      {categoryId && (
        <>
          <div className="mt-6">
            <DataTable
              columns={columns}
              data={filters}
              getRowKey={(filter) => filter.id}
              emptyMessage={loading ? "იტვირთება..." : "ფილტრი ჯერ არ დამატებულა"}
              actions={(filter) => (
                <button
                  type="button"
                  onClick={() => setDeletingFilter(filter)}
                  className="rounded-full px-3 py-1 text-xs font-semibold text-red-600 transition-colors hover:bg-red-500/10"
                >
                  წაშლა
                </button>
              )}
            />
          </div>

          <div className="mt-6 flex flex-col gap-3 rounded-lg border border-border p-4 sm:flex-row sm:items-end">
            <div className="flex flex-1 flex-col gap-1.5">
              <label className="text-sm font-medium">ტიპი</label>
              <Select
                options={filterTypeOptions}
                value={newFilterType}
                onChange={(value) => {
                  setNewFilterType(value);
                  setNewSpecField("");
                }}
                placeholder="აირჩიეთ ტიპი"
              />
            </div>
            {newFilterType === "SPEC" && (
              <div className="flex flex-1 flex-col gap-1.5">
                <label className="text-sm font-medium">მახასიათებელი</label>
                <Select
                  options={specFieldOptions}
                  value={newSpecField}
                  onChange={setNewSpecField}
                  searchable
                  placeholder="აირჩიეთ მახასიათებელი"
                />
              </div>
            )}
            <button
              type="button"
              onClick={handleAddFilter}
              disabled={adding || !newFilterType}
              className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover disabled:opacity-50"
            >
              + ფილტრის დამატება
            </button>
          </div>
        </>
      )}

      <ConfirmDialog
        open={deletingFilter !== null}
        onClose={() => setDeletingFilter(null)}
        title="ფილტრის წაშლა"
        message={
          <>
            დარწმუნებული ხართ, რომ გსურთ წაშალოთ ფილტრი{" "}
            <span className="font-semibold text-foreground">
              {deletingFilter ? filterLabel(deletingFilter) : ""}
            </span>
            ?
          </>
        }
        successMessage="ფილტრი წაიშალა"
        onConfirm={async () => {
          if (!deletingFilter) return;
          await deleteVehicleCategoryFilter(deletingFilter.id);
          await loadForCategory(categoryId);
        }}
      />
    </div>
  );
}
