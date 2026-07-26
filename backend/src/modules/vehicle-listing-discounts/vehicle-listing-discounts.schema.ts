import { z } from "zod";
import { registry } from "../../docs/registry.js";

export const vehicleListingDiscountListingIdParamSchema = z.object({
  listingId: z.coerce.number().int().positive(),
});

export const vehicleListingDiscountIdParamSchema = z.object({
  listingId: z.coerce.number().int().positive(),
  id: z.coerce.number().int().positive(),
});

export const createVehicleListingDiscountSchema = registry.register(
  "CreateVehicleListingDiscountInput",
  z.object({
    discountPrice: z.coerce.number().positive().openapi({ example: 3999 }),
    discountPercent: z.coerce.number().min(0).max(100).nullable().optional().openapi({ example: 15 }),
    startDate: z.iso.date().openapi({ example: "2026-08-01" }),
    endDate: z.iso.date().openapi({ example: "2026-08-15" }),
  }),
);
export type CreateVehicleListingDiscountInput = z.infer<
  typeof createVehicleListingDiscountSchema
>;

export const updateVehicleListingDiscountSchema = registry.register(
  "UpdateVehicleListingDiscountInput",
  createVehicleListingDiscountSchema.partial(),
);
export type UpdateVehicleListingDiscountInput = z.infer<
  typeof updateVehicleListingDiscountSchema
>;

export const vehicleListingDiscountResponseSchema = registry.register(
  "VehicleListingDiscount",
  z.object({
    id: z.int().openapi({ example: 1 }),
    vehicleListingId: z.int(),
    discountPrice: z.number().openapi({ example: 3999 }),
    discountPercent: z.number().nullable().openapi({ example: 15 }),
    startDate: z.iso.date(),
    endDate: z.iso.date(),
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
  }),
);
