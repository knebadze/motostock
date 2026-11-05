import type { AdminFilterField } from "@/components/admin/shared/AdminFilterPanel";
import type { Category } from "@/lib/api/categories";
import { flattenTree } from "@/lib/categories-tree";

export function buildProductBrandFilterFields(data: { categories: Category[] }): AdminFilterField[] {
  return [
    { key: "NAME", label: "სახელი", section: "ძირითადი", kind: "TEXT" },
    {
      key: "CATEGORY",
      label: "კატეგორია",
      section: "ძირითადი",
      kind: "MULTI_SELECT",
      options: flattenTree(data.categories).map((category) => ({
        value: String(category.id),
        label: `${"— ".repeat(category.depth)}${category.name.ka}`,
      })),
    },
  ];
}
