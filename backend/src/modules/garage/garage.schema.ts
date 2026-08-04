import { z } from "zod";
import { registry } from "../../docs/registry.js";
import { vehicleCatalogResponseSchema } from "../vehicle-catalog/vehicle-catalog.schema.js";

export const createGarageVehicleSchema = registry.register(
  "CreateGarageVehicleInput",
  z.object({
    vehicleCatalogId: z.int().positive(),
    year: z.int().min(1900).max(2100).openapi({ example: 2022 }),
    vin: z.string().trim().max(32).nullable().optional().openapi({ example: "JTHBP5C2XA5034185" }),
  }),
);
export type CreateGarageVehicleInput = z.infer<typeof createGarageVehicleSchema>;

export const updateGarageVehicleSchema = createGarageVehicleSchema;
export type UpdateGarageVehicleInput = z.infer<typeof updateGarageVehicleSchema>;

export const garageVehicleIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const garageVehicleResponseSchema = registry.register(
  "GarageVehicle",
  z.object({
    id: z.int().openapi({ example: 1 }),
    year: z.int(),
    vin: z.string().nullable(),
    vehicleCatalog: vehicleCatalogResponseSchema,
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
  }),
);
