import type { AdminFilterField } from "@/components/admin/shared/AdminFilterPanel";
import type { Brand } from "@/lib/api/brands";
import type { Model } from "@/lib/api/models";
import type { Category } from "@/lib/api/categories";
import type { LookupItem } from "@/lib/api/lookups";
import { VEHICLE_SPEC_FIELDS } from "@/config/vehicle-spec-fields";

function toOptions<T extends { id: number }>(items: T[], label: (item: T) => string) {
  return items.map((item) => ({ value: String(item.id), label: label(item) }));
}

export function buildVehicleCatalogFilterFields(data: {
  brands: Brand[];
  models: Model[];
  categories: Category[];
  fuelTypes: LookupItem[];
  transmissionTypes: LookupItem[];
  coolingTypes: LookupItem[];
  finalDriveTypes: LookupItem[];
  driveTypes: LookupItem[];
  startTypes: LookupItem[];
  powertrainTypes: LookupItem[];
}): AdminFilterField[] {
  const lookupOptionsByField: Partial<Record<string, LookupItem[]>> = {
    FUEL_TYPE: data.fuelTypes,
    TRANSMISSION_TYPE: data.transmissionTypes,
    COOLING_TYPE: data.coolingTypes,
    FINAL_DRIVE_TYPE: data.finalDriveTypes,
    DRIVE_TYPE: data.driveTypes,
    START_TYPE: data.startTypes,
    POWERTRAIN_TYPE: data.powertrainTypes,
  };

  const basicFields: AdminFilterField[] = [
    {
      key: "BRAND",
      label: "მარკა",
      section: "ძირითადი",
      kind: "MULTI_SELECT",
      options: toOptions(data.brands, (b) => b.name.ka),
    },
    {
      key: "MODEL",
      label: "მოდელი",
      section: "ძირითადი",
      kind: "MULTI_SELECT",
      options: toOptions(data.models, (m) => m.name.ka),
    },
    {
      key: "CATEGORY",
      label: "კატეგორია",
      section: "ძირითადი",
      kind: "MULTI_SELECT",
      options: toOptions(data.categories, (c) => c.name.ka),
    },
    { key: "VARIANT", label: "ვარიანტი", section: "ძირითადი", kind: "TEXT" },
    { key: "YEAR_FROM", label: "წელი (დან)", section: "ძირითადი", kind: "RANGE" },
    { key: "YEAR_TO", label: "წელი (მდე)", section: "ძირითადი", kind: "RANGE" },
  ];

  const specFields: AdminFilterField[] = VEHICLE_SPEC_FIELDS.map((spec) => ({
    key: spec.field,
    label: spec.label,
    section: "ტექნიკური",
    kind: spec.kind === "LOOKUP" ? "MULTI_SELECT" : spec.kind === "NUMBER" ? "RANGE" : "BOOLEAN",
    options:
      spec.kind === "LOOKUP"
        ? (lookupOptionsByField[spec.field] ?? []).map((item) => ({
            value: String(item.id),
            label: item.nameKa,
          }))
        : undefined,
  }));

  return [...basicFields, ...specFields];
}
