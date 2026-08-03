import { z } from "zod";
import { registry } from "../../docs/registry.js";
import { localizedStringSchema } from "../../lib/localized.js";

export const vehicleCategoryFilterTypeSchema = z.enum(["PRICE", "YEAR", "BRAND", "SPEC"]);
export type VehicleCategoryFilterTypeInput = z.infer<typeof vehicleCategoryFilterTypeSchema>;

// Kept as an explicit literal list (rather than derived from the spec-fields
// registry) to match every other enum schema in this codebase — see
// attributeValueTypeSchema / categoryFilterTypeSchema — and because deriving
// it from Object.keys() widens back to `string`, losing the literal union
// zod (and Prisma's generated VehicleSpecField enum) need to line up.
export const vehicleSpecFieldSchema = z.enum([
  "FUEL_TYPE",
  "TRANSMISSION_TYPE",
  "COOLING_TYPE",
  "FINAL_DRIVE_TYPE",
  "DRIVE_TYPE",
  "START_TYPE",
  "POWERTRAIN_TYPE",
  "ENGINE_VOLUME_CC",
  "ENGINE_POWER_HP",
  "CYLINDER_COUNT",
  "GEAR_COUNT",
  "SEAT_COUNT",
  "WEIGHT_KG",
  "SEAT_HEIGHT_MM",
  "FUEL_TANK_LITERS",
  "TOP_SPEED_KMH",
  "MOTOR_POWER_WATT",
  "BATTERY_CAPACITY_WH",
  "RANGE_KM",
  "CHARGING_TIME_MINUTES",
  "HAS_ABS",
  "HAS_LOCKING_DIFFERENTIAL",
]);
export type VehicleSpecFieldInput = z.infer<typeof vehicleSpecFieldSchema>;

export const specFieldKindSchema = z.enum(["LOOKUP", "NUMBER", "BOOLEAN"]);

export const createVehicleCategoryFilterSchema = registry.register(
  "CreateVehicleCategoryFilterInput",
  z.object({
    categoryId: z.int().positive(),
    filterType: vehicleCategoryFilterTypeSchema,
    specField: vehicleSpecFieldSchema.nullable().optional(),
    sortOrder: z.int().optional(),
  }),
);
export type CreateVehicleCategoryFilterInput = z.infer<typeof createVehicleCategoryFilterSchema>;

export const updateVehicleCategoryFilterSchema = registry.register(
  "UpdateVehicleCategoryFilterInput",
  z.object({ sortOrder: z.int() }),
);
export type UpdateVehicleCategoryFilterInput = z.infer<typeof updateVehicleCategoryFilterSchema>;

export const vehicleCategoryFilterIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const vehicleCategoryFilterListQuerySchema = z.object({
  categoryId: z.coerce.number().int().positive(),
});
export type VehicleCategoryFilterListQuery = z.infer<typeof vehicleCategoryFilterListQuerySchema>;

const namedRefSchema = z.object({ id: z.int(), name: localizedStringSchema, slug: z.string() });

const lookupOptionRefSchema = z.object({
  id: z.int(),
  key: z.string(),
  label: localizedStringSchema,
});

export const vehicleCategoryFilterResponseSchema = registry.register(
  "VehicleCategoryFilterConfig",
  z.object({
    id: z.int().openapi({ example: 1 }),
    categoryId: z.int(),
    // The row's own defining category — differs from the browsed/managed
    // category when this filter was inherited from a parent category.
    category: namedRefSchema,
    filterType: vehicleCategoryFilterTypeSchema,
    sortOrder: z.int(),
    // Only present for filterType = SPEC.
    specField: vehicleSpecFieldSchema.nullable(),
    specFieldLabel: localizedStringSchema.nullable(),
    specFieldKind: specFieldKindSchema.nullable(),
    // Only present for filterType = SPEC and specFieldKind = LOOKUP.
    lookupOptions: z.array(lookupOptionRefSchema).nullable(),
  }),
);
