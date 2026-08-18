import type { AdminFilterField } from "@/components/admin/shared/AdminFilterPanel";
import type { Category } from "@/lib/api/categories";
import type { ProductBrand } from "@/lib/api/product-brands";
import type { LookupItem } from "@/lib/api/lookups";

function toLookupOptions(items: LookupItem[]) {
  return items.map((item) => ({ value: String(item.id), label: item.nameKa }));
}

// Dynamic per-category ATTRIBUTE:<id> keys (already supported backend-side,
// see filters/product/product-admin-filter-registry.ts) aren't exposed here
// yet — they'd need every category's attribute+option list loaded up front;
// left for a follow-up once that data is readily available on this page.
export function buildProductFilterFields(data: {
  categories: Category[];
  productBrands: ProductBrand[];
  sizes: LookupItem[];
  colors: LookupItem[];
  conditions: LookupItem[];
  statuses: LookupItem[];
}): AdminFilterField[] {
  return [
    { key: "SEARCH", label: "ძებნა (სახელი)", section: "ძირითადი", kind: "TEXT" },
    { key: "SLUG", label: "Slug", section: "ძირითადი", kind: "TEXT" },
    {
      key: "CATEGORY",
      label: "კატეგორია",
      section: "ძირითადი",
      kind: "MULTI_SELECT",
      options: data.categories.map((category) => ({
        value: String(category.id),
        label: category.name.ka,
      })),
    },
    {
      key: "BRAND",
      label: "ბრენდი",
      section: "ძირითადი",
      kind: "MULTI_SELECT",
      options: data.productBrands.map((brand) => ({ value: String(brand.id), label: brand.name })),
    },
    { key: "PRICE", label: "ფასი", section: "ვარიანტები", kind: "RANGE" },
    { key: "STOCK_QUANTITY", label: "მარაგი", section: "ვარიანტები", kind: "RANGE" },
    { key: "SKU", label: "SKU", section: "ვარიანტები", kind: "TEXT" },
    { key: "IS_ACTIVE", label: "მხოლოდ აქტიური ვარიანტები", section: "ვარიანტები", kind: "BOOLEAN" },
    {
      key: "SIZE",
      label: "ზომა",
      section: "ვარიანტები",
      kind: "MULTI_SELECT",
      options: toLookupOptions(data.sizes),
    },
    {
      key: "COLOR",
      label: "ფერი",
      section: "ვარიანტები",
      kind: "MULTI_SELECT",
      options: toLookupOptions(data.colors),
    },
    {
      key: "CONDITION",
      label: "მდგომარეობა",
      section: "ვარიანტები",
      kind: "MULTI_SELECT",
      options: toLookupOptions(data.conditions),
    },
    {
      key: "STATUS",
      label: "სტატუსი",
      section: "ვარიანტები",
      kind: "MULTI_SELECT",
      options: toLookupOptions(data.statuses),
    },
  ];
}
