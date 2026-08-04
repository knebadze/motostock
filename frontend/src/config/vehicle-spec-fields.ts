import type { SpecFieldKind, VehicleSpecField } from "@/lib/api/vehicle-category-filters";
import type { LookupTypeSlug } from "./lookup-types";

// Mirrors backend/src/modules/vehicle-category-filters/vehicle-spec-fields.registry.ts —
// vehicle "attributes" are a fixed set of VehicleCatalog columns (no generic
// Attribute model like products have), so the admin picker needs its own
// static catalog of every field + label instead of fetching one per category.
// `lookupType` (LOOKUP-kind fields only) is which classifier list backs that
// field's values — used by the product fitment rules picker to fetch the
// right options for "this spec equals that value".
export const VEHICLE_SPEC_FIELDS: {
  field: VehicleSpecField;
  label: string;
  kind: SpecFieldKind;
  lookupType?: LookupTypeSlug;
}[] = [
  { field: "FUEL_TYPE", label: "საწვავის ტიპი", kind: "LOOKUP", lookupType: "fuel-types" },
  {
    field: "TRANSMISSION_TYPE",
    label: "გადაცემათა კოლოფის ტიპი",
    kind: "LOOKUP",
    lookupType: "transmission-types",
  },
  { field: "COOLING_TYPE", label: "გაგრილების ტიპი", kind: "LOOKUP", lookupType: "cooling-types" },
  {
    field: "FINAL_DRIVE_TYPE",
    label: "გადაცემის ტიპი",
    kind: "LOOKUP",
    lookupType: "final-drive-types",
  },
  {
    field: "DRIVE_TYPE",
    label: "წამყვანი თვლების ტიპი",
    kind: "LOOKUP",
    lookupType: "drive-types",
  },
  { field: "START_TYPE", label: "გაშვების სისტემა", kind: "LOOKUP", lookupType: "start-types" },
  {
    field: "POWERTRAIN_TYPE",
    label: "ძრავის კვების ტიპი",
    kind: "LOOKUP",
    lookupType: "powertrain-types",
  },
  { field: "ENGINE_VOLUME_CC", label: "ძრავის მოცულობა (სმ³)", kind: "NUMBER" },
  { field: "ENGINE_POWER_HP", label: "ძრავის სიმძლავრე (ცხ.ძ.)", kind: "NUMBER" },
  { field: "CYLINDER_COUNT", label: "ცილინდრების რაოდენობა", kind: "NUMBER" },
  { field: "GEAR_COUNT", label: "გადაცემების რაოდენობა", kind: "NUMBER" },
  { field: "SEAT_COUNT", label: "სავარძლების რაოდენობა", kind: "NUMBER" },
  { field: "WEIGHT_KG", label: "წონა (კგ)", kind: "NUMBER" },
  { field: "SEAT_HEIGHT_MM", label: "სავარძლის სიმაღლე (მმ)", kind: "NUMBER" },
  { field: "FUEL_TANK_LITERS", label: "საწვავის ავზი (ლ)", kind: "NUMBER" },
  { field: "TOP_SPEED_KMH", label: "მაქსიმალური სიჩქარე (კმ/სთ)", kind: "NUMBER" },
  { field: "MOTOR_POWER_WATT", label: "ელექტროძრავის სიმძლავრე (ვტ)", kind: "NUMBER" },
  { field: "BATTERY_CAPACITY_WH", label: "ბატარეის ტევადობა (ვტ*სთ)", kind: "NUMBER" },
  { field: "RANGE_KM", label: "სვლის მარაგი (კმ)", kind: "NUMBER" },
  { field: "CHARGING_TIME_MINUTES", label: "დატენვის დრო (წთ)", kind: "NUMBER" },
  { field: "HAS_ABS", label: "ABS სისტემა", kind: "BOOLEAN" },
  { field: "HAS_LOCKING_DIFFERENTIAL", label: "დიფერენციალის ბლოკირება", kind: "BOOLEAN" },
];

export function getVehicleSpecFieldLabel(field: VehicleSpecField): string {
  return VEHICLE_SPEC_FIELDS.find((item) => item.field === field)?.label ?? field;
}
