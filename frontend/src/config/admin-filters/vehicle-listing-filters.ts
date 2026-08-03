import type { AdminFilterField } from "@/components/admin/shared/AdminFilterPanel";
import type { VehicleCatalogEntry } from "@/lib/api/vehicle-catalog";
import type { LookupItem } from "@/lib/api/lookups";
import { VEHICLE_SPEC_FIELDS } from "@/config/vehicle-spec-fields";

function dedupeNamedRefs(refs: { id: number; name: { ka: string } }[]) {
  const byId = new Map(refs.map((ref) => [ref.id, ref]));
  return Array.from(byId.values()).sort((a, b) => a.name.ka.localeCompare(b.name.ka));
}

function toLookupOptions(items: LookupItem[]) {
  return items.map((item) => ({ value: String(item.id), label: item.nameKa }));
}

// LOOKUP-kind spec fields (fuel type, transmission, ...) need option lists
// this manager doesn't currently load (see vehicle-catalog's admin filter for
// full spec coverage) — NUMBER/BOOLEAN spec fields need no options at all, so
// those stay fully available here.
export function buildVehicleListingFilterFields(data: {
  vehicleCatalog: VehicleCatalogEntry[];
  conditions: LookupItem[];
  statuses: LookupItem[];
  colors: LookupItem[];
}): AdminFilterField[] {
  const brands = dedupeNamedRefs(data.vehicleCatalog.map((entry) => entry.brand));
  const models = dedupeNamedRefs(data.vehicleCatalog.map((entry) => entry.model));
  const categories = dedupeNamedRefs(data.vehicleCatalog.map((entry) => entry.category));

  const basicFields: AdminFilterField[] = [
    { key: "SEARCH", label: "ძებნა (მარკა/მოდელი)", section: "ძირითადი", kind: "TEXT" },
    {
      key: "CATEGORY",
      label: "კატეგორია",
      section: "ძირითადი",
      kind: "MULTI_SELECT",
      options: categories.map((c) => ({ value: String(c.id), label: c.name.ka })),
    },
    {
      key: "BRAND",
      label: "მარკა",
      section: "ძირითადი",
      kind: "MULTI_SELECT",
      options: brands.map((b) => ({ value: String(b.id), label: b.name.ka })),
    },
    {
      key: "MODEL",
      label: "მოდელი",
      section: "ძირითადი",
      kind: "MULTI_SELECT",
      options: models.map((m) => ({ value: String(m.id), label: m.name.ka })),
    },
    { key: "PRICE", label: "ფასი", section: "ძირითადი", kind: "RANGE" },
    { key: "YEAR", label: "წელი", section: "ძირითადი", kind: "RANGE" },
    {
      key: "CONDITION",
      label: "მდგომარეობა",
      section: "ძირითადი",
      kind: "MULTI_SELECT",
      options: toLookupOptions(data.conditions),
    },
    {
      key: "STATUS",
      label: "სტატუსი",
      section: "ძირითადი",
      kind: "MULTI_SELECT",
      options: toLookupOptions(data.statuses),
    },
    {
      key: "COLOR",
      label: "ფერი",
      section: "ძირითადი",
      kind: "MULTI_SELECT",
      options: toLookupOptions(data.colors),
    },
    { key: "STOCK_QUANTITY", label: "მარაგი", section: "ძირითადი", kind: "RANGE" },
    { key: "IS_ACTIVE", label: "მხოლოდ აქტიური", section: "ძირითადი", kind: "BOOLEAN" },
  ];

  const specFields: AdminFilterField[] = VEHICLE_SPEC_FIELDS.filter(
    (spec) => spec.kind !== "LOOKUP",
  ).map((spec) => ({
    key: spec.field,
    label: spec.label,
    section: "ტექნიკური",
    kind: spec.kind === "NUMBER" ? "RANGE" : "BOOLEAN",
  }));

  return [...basicFields, ...specFields];
}
