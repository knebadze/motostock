import type { AdminFilterField } from "@/components/admin/shared/AdminFilterPanel";
import type { Brand } from "@/lib/api/brands";
import type { Category } from "@/lib/api/categories";
import { isVehicleCategory } from "@/lib/categories-tree";

export function buildModelFilterFields(data: { brands: Brand[]; categories: Category[] }): AdminFilterField[] {
  // Model.categoryId is always a vehicle (transport) category — same
  // isVehicleCategory scoping as ModelFormModal/VehicleCatalogFormModal's
  // category pickers, so "ტიპი" doesn't also offer product categories.
  const vehicleCategories = data.categories.filter((category) =>
    isVehicleCategory(data.categories, category.id),
  );

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
      options: vehicleCategories.map((category) => ({ value: String(category.id), label: category.name.ka })),
    },
  ];
}
