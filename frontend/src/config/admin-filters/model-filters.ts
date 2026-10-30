import type { AdminFilterField } from "@/components/admin/shared/AdminFilterPanel";
import type { Brand } from "@/lib/api/brands";
import type { Category } from "@/lib/api/categories";

export function buildModelFilterFields(data: { brands: Brand[]; categories: Category[] }): AdminFilterField[] {
  return [
    { key: "NAME", label: "სახელი", section: "ძირითადი", kind: "TEXT" },
    {
      key: "BRAND",
      label: "მარკა",
      section: "ძირითადი",
      kind: "MULTI_SELECT",
      options: data.brands.map((brand) => ({ value: String(brand.id), label: brand.name })),
    },
    {
      key: "CATEGORY",
      label: "ტიპი",
      section: "ძირითადი",
      kind: "MULTI_SELECT",
      options: data.categories.map((category) => ({ value: String(category.id), label: category.name.ka })),
    },
  ];
}
