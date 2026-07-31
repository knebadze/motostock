"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Select } from "@/components/shared/Select";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { DataTable, type DataTableColumn } from "@/components/shared/DataTable";
import {
  createCategoryFilter,
  deleteCategoryFilter,
  listCategoryFilters,
  updateCategoryFilterSortOrder,
  type CategoryFilter,
  type CategoryFilterType,
} from "@/lib/api/category-filters";
import { listAttributes, type Attribute } from "@/lib/api/attributes";
import type { Category } from "@/lib/api/categories";
import { ApiRequestError } from "@/lib/api/client";
import { flattenTree } from "@/lib/categories-tree";

const FILTER_TYPE_OPTIONS: { value: CategoryFilterType; label: string }[] = [
  { value: "PRICE", label: "ფასი" },
  { value: "BRAND", label: "ბრენდი" },
  { value: "ATTRIBUTE", label: "მახასიათებელი" },
];

function filterLabel(filter: CategoryFilter): string {
  if (filter.filterType === "PRICE") return "ფასი";
  if (filter.filterType === "BRAND") return "ბრენდი";
  return filter.attribute?.name.ka ?? "მახასიათებელი";
}

export function CategoryFiltersManager({ categories }: { categories: Category[] }) {
  const [categoryId, setCategoryId] = useState("");
  const [filters, setFilters] = useState<CategoryFilter[]>([]);
  const [attributes, setAttributes] = useState<Attribute[]>([]);
  const [loading, setLoading] = useState(false);
  const [newFilterType, setNewFilterType] = useState<string>("");
  const [newAttributeId, setNewAttributeId] = useState("");
  const [adding, setAdding] = useState(false);
  const [deletingFilter, setDeletingFilter] = useState<CategoryFilter | null>(null);

  const categoryOptions = flattenTree(categories).map((category) => ({
    value: String(category.id),
    label: `${"— ".repeat(category.depth)}${category.name.ka}`,
  }));

  async function loadForCategory(id: string) {
    if (!id) {
      setFilters([]);
      setAttributes([]);
      return;
    }
    setLoading(true);
    try {
      const [filterItems, attributeItems] = await Promise.all([
        listCategoryFilters(Number(id)),
        listAttributes(Number(id)),
      ]);
      setFilters(filterItems);
      setAttributes(attributeItems);
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
    setNewAttributeId("");
    await loadForCategory(value);
  }

  const usedAttributeIds = new Set(filters.filter((f) => f.attribute).map((f) => f.attribute!.id));
  const hasPriceFilter = filters.some((f) => f.filterType === "PRICE");
  const hasBrandFilter = filters.some((f) => f.filterType === "BRAND");
  const availableAttributes = attributes.filter(
    (attribute) => attribute.valueType !== "TEXT" && !usedAttributeIds.has(attribute.id),
  );

  const filterTypeOptions = FILTER_TYPE_OPTIONS.filter((option) => {
    if (option.value === "PRICE") return !hasPriceFilter;
    if (option.value === "BRAND") return !hasBrandFilter;
    return availableAttributes.length > 0;
  });

  const attributeOptions = availableAttributes.map((attribute) => ({
    value: String(attribute.id),
    label: attribute.name.ka,
  }));

  async function handleAddFilter() {
    if (!categoryId || !newFilterType) return;
    if (newFilterType === "ATTRIBUTE" && !newAttributeId) {
      toast.error("აირჩიეთ მახასიათებელი");
      return;
    }

    setAdding(true);
    try {
      const maxSortOrder = filters.reduce((max, filter) => Math.max(max, filter.sortOrder), -1);
      await createCategoryFilter({
        categoryId: Number(categoryId),
        filterType: newFilterType as CategoryFilterType,
        attributeId: newFilterType === "ATTRIBUTE" ? Number(newAttributeId) : undefined,
        sortOrder: maxSortOrder + 1,
      });
      toast.success("ფილტრი დაემატა");
      setNewFilterType("");
      setNewAttributeId("");
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
      await updateCategoryFilterSortOrder(filterId, value);
      await loadForCategory(categoryId);
    } catch (error) {
      const message = error instanceof ApiRequestError ? error.message : "დალაგება ვერ განახლდა";
      toast.error(message);
      await loadForCategory(categoryId);
    }
  }

  const columns: DataTableColumn<CategoryFilter>[] = [
    { header: "ფილტრი", render: (filter) => filterLabel(filter) },
    {
      header: "ტიპი",
      render: (filter) =>
        filter.filterType === "ATTRIBUTE" ? filter.attribute?.valueType ?? "" : filter.filterType,
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
      <h1 className="text-2xl font-bold tracking-tight">კატეგორიის ფილტრები</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        აირჩიეთ კატეგორია და აწყვეთ, რომელი ფილტრები გამოჩნდეს შოპში ამ კატეგორიისთვის და რა
        თანმიმდევრობით.
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
                  setNewAttributeId("");
                }}
                placeholder="აირჩიეთ ტიპი"
              />
            </div>
            {newFilterType === "ATTRIBUTE" && (
              <div className="flex flex-1 flex-col gap-1.5">
                <label className="text-sm font-medium">მახასიათებელი</label>
                <Select
                  options={attributeOptions}
                  value={newAttributeId}
                  onChange={setNewAttributeId}
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
          await deleteCategoryFilter(deletingFilter.id);
          await loadForCategory(categoryId);
        }}
      />
    </div>
  );
}
