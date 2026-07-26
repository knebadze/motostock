import { z } from "zod";
import { registry } from "../../docs/registry.js";
import { localizedStringSchema } from "../../lib/localized.js";
import { lookupItemResponseSchema } from "../lookups/lookups.schema.js";

const optionalPositiveInt = z.int().positive().nullable().optional();
const optionalYear = z.int().min(1900).max(2100).nullable().optional();
const optionalDescription = z.string().max(5000).nullable().optional();

export const createVehicleCatalogSchema = registry.register(
  "CreateVehicleCatalogInput",
  z.object({
    categoryId: z.int().positive(),
    brandId: z.int().positive(),
    modelId: z.int().positive(),
    yearFrom: optionalYear,
    yearTo: optionalYear,
    engineVolumeCc: optionalPositiveInt,
    enginePowerHp: optionalPositiveInt,
    cylinderCount: optionalPositiveInt,
    gearCount: optionalPositiveInt,
    seatCount: optionalPositiveInt,
    fuelTypeId: optionalPositiveInt,
    transmissionTypeId: optionalPositiveInt,
    coolingTypeId: optionalPositiveInt,
    finalDriveTypeId: optionalPositiveInt,
    driveTypeId: optionalPositiveInt,
    startTypeId: optionalPositiveInt,
    descriptionKa: optionalDescription,
    descriptionEn: optionalDescription,
    descriptionRu: optionalDescription,
  }),
);
export type CreateVehicleCatalogInput = z.infer<typeof createVehicleCatalogSchema>;

export const updateVehicleCatalogSchema = registry.register(
  "UpdateVehicleCatalogInput",
  createVehicleCatalogSchema.partial(),
);
export type UpdateVehicleCatalogInput = z.infer<typeof updateVehicleCatalogSchema>;

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
    yearFrom: z.int().nullable(),
    yearTo: z.int().nullable(),
    engineVolumeCc: z.int().nullable(),
    enginePowerHp: z.int().nullable(),
    cylinderCount: z.int().nullable(),
    gearCount: z.int().nullable(),
    seatCount: z.int().nullable(),
    fuelType: lookupItemResponseSchema.nullable(),
    transmissionType: lookupItemResponseSchema.nullable(),
    coolingType: lookupItemResponseSchema.nullable(),
    finalDriveType: lookupItemResponseSchema.nullable(),
    driveType: lookupItemResponseSchema.nullable(),
    startType: lookupItemResponseSchema.nullable(),
    imageUrl: z.string().nullable(),
    descriptionKa: z.string().nullable(),
    descriptionEn: z.string().nullable(),
    descriptionRu: z.string().nullable(),
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
  }),
);
