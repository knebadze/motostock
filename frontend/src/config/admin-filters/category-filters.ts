import type { AdminFilterField } from "@/components/admin/shared/AdminFilterPanel";
import type { Category } from "@/lib/api/categories";

export function buildCategoryFilterFields(data: { categories: Category[] }): AdminFilterField[] {
  return [
    { key: "NAME", label: "სახელი", section: "ძირითადი", kind: "TEXT" },
    { key: "SLUG", label: "Slug", section: "ძირითადი", kind: "TEXT" },
    {
      key: "PARENT",
      label: "მშობელი კატეგორია",
      section: "ძირითადი",
      kind: "MULTI_SELECT",
      options: data.categories.map((category) => ({
        value: String(category.id),
        label: category.name.ka,
      })),
    },
    { key: "SORT_ORDER", label: "თანმიმდევრობა", section: "ძირითადი", kind: "RANGE" },
  ];
}
