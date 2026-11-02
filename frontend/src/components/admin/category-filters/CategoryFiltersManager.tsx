"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Select } from "@/components/shared/Select";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { DataTable, type DataTableColumn } from "@/components/shared/DataTable";
import { Toggle } from "@/components/shared/Toggle";
import {
  createCategoryFilter,
  deleteCategoryFilter,
  listCategoryFilters,
  updateCategoryFilterActive,
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
  { value: "MY_VEHICLE", label: "ჩემი ტრანსპორტის მიხედვით" },
  { value: "ATTRIBUTE", label: "მახასიათებელი" },
];

function filterLabel(filter: CategoryFilter): string {
  if (filter.filterType === "PRICE") return "ფასი";
  if (filter.filterType === "BRAND") return "ბრენდი";
  if (filter.filterType === "MY_VEHICLE") return "ჩემი ტრანსპორტის მიხედვით";
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
        listAttributes(Number(id), true),
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
  const hasMyVehicleFilter = filters.some((f) => f.filterType === "MY_VEHICLE");
  const availableAttributes = attributes.filter(
    (attribute) => attribute.valueType !== "TEXT" && !usedAttributeIds.has(attribute.id),
  );

  const filterTypeOptions = FILTER_TYPE_OPTIONS.filter((option) => {
    if (option.value === "PRICE") return !hasPriceFilter;
    if (option.value === "BRAND") return !hasBrandFilter;
    if (option.value === "MY_VEHICLE") return !hasMyVehicleFilter;
    return availableAttributes.length > 0;
  });

  // Subcategory attributes are offered too (shown on this page only where
  // products under it use them) — labelled with their category so e.g. two
  // different "ტიპი" can be told apart.
  const attributeOptions = availableAttributes.map((attribute) => ({
    value: String(attribute.id),
    label:
      String(attribute.category.id) === categoryId
        ? attribute.name.ka
        : `${attribute.name.ka} (${attribute.category.name.ka})`,
  }));

  async function handleAddFilter() {
    if (!categoryId || !newFilterType) return;
    if (newFilterType === "ATTRIBUTE" && !newAttributeId) {
      toast.error("აირჩიეთ მახასიათებელი");
      return;
    }

    setAdding(true);
    try {
      await createCategoryFilter({
        categoryId: Number(categoryId),
        filterType: newFilterType as CategoryFilterType,
        attributeId: newFilterType === "ATTRIBUTE" ? Number(newAttributeId) : undefined,
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

  // Optimistic: the switch flips at once, reverted if the save fails.
  async function handleActiveToggle(filter: CategoryFilter, isActive: boolean) {
    setFilters((current) => current.map((item) => (item.id === filter.id ? { ...item, isActive } : item)));
    try {
      await updateCategoryFilterActive(filter.id, isActive);
      toast.success(isActive ? "ფილტრი ჩაირთო" : "ფილტრი გამოირთო");
    } catch (error) {
      const message = error instanceof ApiRequestError ? error.message : "სტატუსი ვერ განახლდა";
      toast.error(message);
      await loadForCategory(categoryId);
    }
  }

  const columns: DataTableColumn<CategoryFilter>[] = [
    {
      header: "ფილტრი",
      render: (filter) => (
        <span className={filter.isActive ? undefined : "text-muted-foreground line-through"}>{filterLabel(filter)}</span>
      ),
    },
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
    {
      header: "აქტიური",
      render: (filter) => (
        <Toggle
          checked={filter.isActive}
          onChange={(isActive) => handleActiveToggle(filter, isActive)}
          label={`${filterLabel(filter)} — აქტიური`}
        />
      ),
    },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">კატეგორიის ფილტრები</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        შოპი ფილტრებს ავტომატურად აჩვენებს: ფასს, ბრენდს, „ჩემ ტრანსპორტს&rdquo; (სადაც თავსებადობა
        ჩართულია) და ამ კატეგორიის ყველა მახასიათებელს, რომელიც მის პროდუქტებს აქვს — მხოლოდ
        არსებული მნიშვნელობებით. აქ ხელით დამატებული ფილტრები ზემოთ, თქვენი თანმიმდევრობით
        გამოჩნდება. ქვეკატეგორიის მახასიათებელიც შეგიძლიათ დაამატოთ (მაგ. „სიბლანტე&rdquo; მთავარ
        „სათადარიგო ნაწილების&rdquo; გვერდზე) — ავტომატურად ის მხოლოდ ქვეკატეგორიაში ჩანს.
        გამორთული ფილტრი შოპში აღარ ჩანს, მაგრამ არ იშლება. ავტომატური ფილტრის დასამალად
        დაამატეთ იგი აქ და გამორთეთ.
      </p>

      <div className="mt-4 w-72">
        <Select
          options={categoryOptions}
          value={categoryId}
          onChange={handleCategoryChange}
          searchable
          placeholder="აირჩიეთ კატეგორია"
          ariaLabel="კატეგორია"
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
                  className="rounded-full px-3 py-1 text-xs font-semibold text-destructive transition-colors hover:bg-red-500/10"
                >
                  წაშლა
                </button>
              )}
            />
          </div>

          <div className="mt-6 flex flex-col gap-3 rounded-lg border border-border p-4 sm:flex-row sm:items-end">
            <div className="flex flex-1 flex-col gap-1.5">
              <label htmlFor="category-filter-new-type" className="text-sm font-medium">
                ტიპი
              </label>
              <Select
                id="category-filter-new-type"
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
                <label htmlFor="category-filter-new-attribute" className="text-sm font-medium">
                  მახასიათებელი
                </label>
                <Select
                  id="category-filter-new-attribute"
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
