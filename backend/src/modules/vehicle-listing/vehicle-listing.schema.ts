import { z } from "zod";
import { registry } from "../../docs/registry.js";
import { localizedStringSchema } from "../../lib/localized.js";
import { lookupItemResponseSchema } from "../lookups/lookups.schema.js";
import { vehicleListingDiscountResponseSchema } from "../vehicle-listing-discounts/vehicle-listing-discounts.schema.js";
import { vehicleListingImageResponseSchema } from "../vehicle-listing-images/vehicle-listing-images.schema.js";

export const createVehicleListingSchema = registry.register(
  "CreateVehicleListingInput",
  z.object({
    vehicleCatalogId: z.int().positive(),
    conditionId: z.int().positive(),
    statusId: z.int().positive(),
    colorId: z.int().positive(),
    year: z.int().min(1900).max(2100).openapi({ example: 2022 }),
    isActive: z.boolean().optional(),
    price: z.coerce.number().positive().openapi({ example: 4500 }),
    stockQuantity: z.int().positive().optional(),
    descriptionKa: z.string().max(20000).nullable().optional(),
    descriptionEn: z.string().max(20000).nullable().optional(),
    descriptionRu: z.string().max(20000).nullable().optional(),
  }),
);
export type CreateVehicleListingInput = z.infer<typeof createVehicleListingSchema>;

export const updateVehicleListingSchema = registry.register(
  "UpdateVehicleListingInput",
  createVehicleListingSchema.partial(),
);
export type UpdateVehicleListingInput = z.infer<typeof updateVehicleListingSchema>;

export const vehicleListingIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const vehicleListingListQuerySchema = z.object({
  categoryId: z.coerce.number().int().positive().optional(),
});
export type VehicleListingListQuery = z.infer<typeof vehicleListingListQuerySchema>;

const namedRefSchema = z.object({ id: z.int(), name: localizedStringSchema, slug: z.string() });

export const vehicleListingResponseSchema = registry.register(
  "VehicleListing",
  z.object({
    id: z.int().openapi({ example: 1 }),
    vehicleCatalog: z.object({
      id: z.int(),
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
      descriptionKa: z.string().nullable(),
      descriptionEn: z.string().nullable(),
      descriptionRu: z.string().nullable(),
      imageUrl: z.string().nullable(),
    }),
    condition: lookupItemResponseSchema,
    status: lookupItemResponseSchema,
    color: lookupItemResponseSchema,
    year: z.int(),
    isActive: z.boolean(),
    price: z.number().openapi({ example: 4500 }),
    stockQuantity: z.int(),
    descriptionKa: z.string().nullable(),
    descriptionEn: z.string().nullable(),
    descriptionRu: z.string().nullable(),
    images: z.array(vehicleListingImageResponseSchema),
    discounts: z.array(vehicleListingDiscountResponseSchema),
    activeDiscount: vehicleListingDiscountResponseSchema.nullable(),
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
  }),
);
