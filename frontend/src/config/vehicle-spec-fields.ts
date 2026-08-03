import type { SpecFieldKind, VehicleSpecField } from "@/lib/api/vehicle-category-filters";

// Mirrors backend/src/modules/vehicle-category-filters/vehicle-spec-fields.registry.ts —
// vehicle "attributes" are a fixed set of VehicleCatalog columns (no generic
// Attribute model like products have), so the admin picker needs its own
// static catalog of every field + label instead of fetching one per category.
export const VEHICLE_SPEC_FIELDS: { field: VehicleSpecField; label: string; kind: SpecFieldKind }[] = [
  { field: "FUEL_TYPE", label: "საწვავის ტიპი", kind: "LOOKUP" },
  { field: "TRANSMISSION_TYPE", label: "გადაცემათა კოლოფის ტიპი", kind: "LOOKUP" },
  { field: "COOLING_TYPE", label: "გაგრილების ტიპი", kind: "LOOKUP" },
  { field: "FINAL_DRIVE_TYPE", label: "გადაცემის ტიპი", kind: "LOOKUP" },
  { field: "DRIVE_TYPE", label: "წამყვანი თვლების ტიპი", kind: "LOOKUP" },
  { field: "START_TYPE", label: "გაშვების სისტემა", kind: "LOOKUP" },
  { field: "POWERTRAIN_TYPE", label: "ძრავის კვების ტიპი", kind: "LOOKUP" },
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
