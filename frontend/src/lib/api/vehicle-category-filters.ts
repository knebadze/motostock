import { apiClient } from "./client";
import type { LocalizedString } from "./categories";
import type { NamedRef } from "./vehicle-catalog";

export type VehicleCategoryFilterType = "PRICE" | "YEAR" | "BRAND" | "SPEC";

export type VehicleSpecField =
  | "FUEL_TYPE"
  | "TRANSMISSION_TYPE"
  | "COOLING_TYPE"
  | "FINAL_DRIVE_TYPE"
  | "DRIVE_TYPE"
  | "START_TYPE"
  | "POWERTRAIN_TYPE"
  | "ENGINE_VOLUME_CC"
  | "ENGINE_POWER_HP"
  | "CYLINDER_COUNT"
  | "GEAR_COUNT"
  | "SEAT_COUNT"
  | "WEIGHT_KG"
  | "SEAT_HEIGHT_MM"
  | "FUEL_TANK_LITERS"
  | "TOP_SPEED_KMH"
  | "MOTOR_POWER_WATT"
  | "BATTERY_CAPACITY_WH"
  | "RANGE_KM"
  | "CHARGING_TIME_MINUTES"
  | "HAS_ABS"
  | "HAS_LOCKING_DIFFERENTIAL";

export type SpecFieldKind = "LOOKUP" | "NUMBER" | "BOOLEAN";

export type VehicleCategoryFilterLookupOption = { id: number; key: string; label: LocalizedString };

export type VehicleCategoryFilter = {
  id: number;
  categoryId: number;
  // The row's own defining category — differs from the browsed/managed
  // category when this filter was inherited from a parent category.
  category: NamedRef;
  filterType: VehicleCategoryFilterType;
  sortOrder: number;
  // Only present when filterType is "SPEC".
  specField: VehicleSpecField | null;
  specFieldLabel: LocalizedString | null;
  specFieldKind: SpecFieldKind | null;
  // Only present when filterType is "SPEC" and specFieldKind is "LOOKUP".
  lookupOptions: VehicleCategoryFilterLookupOption[] | null;
};

export type VehicleCategoryFilterInput = {
  categoryId: number;
  filterType: VehicleCategoryFilterType;
  specField?: VehicleSpecField | null;
  sortOrder?: number;
};

export async function listVehicleCategoryFilters(
  categoryId: number,
): Promise<VehicleCategoryFilter[]> {
  const { data } = await apiClient.get<{ items: VehicleCategoryFilter[] }>(
    "/vehicle-category-filters",
    { params: { categoryId } },
  );
  return data.items;
}

export async function createVehicleCategoryFilter(
  input: VehicleCategoryFilterInput,
): Promise<VehicleCategoryFilter> {
  const { data } = await apiClient.post<{ item: VehicleCategoryFilter }>(
    "/vehicle-category-filters",
    input,
  );
  return data.item;
}

export async function updateVehicleCategoryFilterSortOrder(
  id: number,
  sortOrder: number,
): Promise<VehicleCategoryFilter> {
  const { data } = await apiClient.patch<{ item: VehicleCategoryFilter }>(
    `/vehicle-category-filters/${id}`,
    { sortOrder },
  );
  return data.item;
}

export async function deleteVehicleCategoryFilter(id: number): Promise<void> {
  await apiClient.delete(`/vehicle-category-filters/${id}`);
}
