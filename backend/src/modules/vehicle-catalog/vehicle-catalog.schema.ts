import { z } from "zod";
import { registry } from "../../docs/registry.js";
import { localizedStringSchema } from "../../lib/localized.js";
import { lookupItemResponseSchema } from "../lookups/lookups.schema.js";

const optionalPositiveInt = z.int().positive().nullable().optional();
const optionalYear = z.int().min(1900).max(2100).nullable().optional();
const optionalDescription = z.string().max(5000).nullable().optional();
const optionalBoolean = z.boolean().nullable().optional();
const optionalPositiveDecimal = z.coerce.number().positive().nullable().optional();

const vehicleCatalogShape = z.object({
  brandId: z.int().positive(),
  modelId: z.int().positive(),
  variant: z.string().trim().max(120).optional(),
  yearFrom: optionalYear,
  yearTo: optionalYear,
  engineVolumeCc: optionalPositiveInt,
  enginePowerHp: optionalPositiveInt,
  cylinderCount: optionalPositiveInt,
  gearCount: optionalPositiveInt,
  seatCount: optionalPositiveInt,
  weightKg: optionalPositiveInt,
  seatHeightMm: optionalPositiveInt,
  fuelTankLiters: optionalPositiveDecimal,
  topSpeedKmh: optionalPositiveInt,
  hasAbs: optionalBoolean,
  fuelTypeId: optionalPositiveInt,
  transmissionTypeId: optionalPositiveInt,
  coolingTypeId: optionalPositiveInt,
  finalDriveTypeId: optionalPositiveInt,
  driveTypeId: optionalPositiveInt,
  startTypeId: optionalPositiveInt,
  powertrainTypeId: optionalPositiveInt,
  motorPowerWatt: optionalPositiveInt,
  batteryCapacityWh: optionalPositiveInt,
  rangeKm: optionalPositiveInt,
  chargingTimeMinutes: optionalPositiveInt,
  hasLockingDifferential: optionalBoolean,
  descriptionKa: optionalDescription,
  descriptionEn: optionalDescription,
  descriptionRu: optionalDescription,
});

function assertYearRangeIsValid(
  data: { yearFrom?: number | null; yearTo?: number | null },
  ctx: z.RefinementCtx,
) {
  if (data.yearFrom != null && data.yearTo != null && data.yearFrom > data.yearTo) {
    ctx.addIssue({
      code: "custom",
      message: "'წელი (დან)' არ უნდა აღემატებოდეს 'წელი (მდე)'-ს",
      path: ["yearTo"],
    });
  }
}

const partialVehicleCatalogShape = vehicleCatalogShape.partial();

export const createVehicleCatalogSchema = registry.register(
  "CreateVehicleCatalogInput",
  vehicleCatalogShape.superRefine(assertYearRangeIsValid),
);
export type CreateVehicleCatalogInput = z.infer<typeof vehicleCatalogShape>;

export const updateVehicleCatalogSchema = registry.register(
  "UpdateVehicleCatalogInput",
  partialVehicleCatalogShape.superRefine(assertYearRangeIsValid),
);
export type UpdateVehicleCatalogInput = z.infer<typeof partialVehicleCatalogShape>;

export const vehicleCatalogIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

const namedRefSchema = z.object({ id: z.int(), name: localizedStringSchema, slug: z.string() });

export const vehicleCatalogResponseSchema = registry.register(
  "VehicleCatalog",
  z.object({
    id: z.int().openapi({ example: 1 }),
    category: namedRefSchema,
    brand: namedRefSchema,
    model: namedRefSchema,
    variant: z.string(),
    yearFrom: z.int().nullable(),
    yearTo: z.int().nullable(),
    engineVolumeCc: z.int().nullable(),
    enginePowerHp: z.int().nullable(),
    cylinderCount: z.int().nullable(),
    gearCount: z.int().nullable(),
    seatCount: z.int().nullable(),
    weightKg: z.int().nullable(),
    seatHeightMm: z.int().nullable(),
    fuelTankLiters: z.number().nullable(),
    topSpeedKmh: z.int().nullable(),
    hasAbs: z.boolean().nullable(),
    fuelType: lookupItemResponseSchema.nullable(),
    transmissionType: lookupItemResponseSchema.nullable(),
    coolingType: lookupItemResponseSchema.nullable(),
    finalDriveType: lookupItemResponseSchema.nullable(),
    driveType: lookupItemResponseSchema.nullable(),
    startType: lookupItemResponseSchema.nullable(),
    powertrainType: lookupItemResponseSchema.nullable(),
    motorPowerWatt: z.int().nullable(),
    batteryCapacityWh: z.int().nullable(),
    rangeKm: z.int().nullable(),
    chargingTimeMinutes: z.int().nullable(),
    hasLockingDifferential: z.boolean().nullable(),
    imageUrl: z.string().nullable(),
    descriptionKa: z.string().nullable(),
    descriptionEn: z.string().nullable(),
    descriptionRu: z.string().nullable(),
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
  }),
);
