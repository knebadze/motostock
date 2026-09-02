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
    // 100 (or above) rejected, not just capped — matches promo-codes.schema.ts's
    // reasoning: even though the actual charged price here is discountPrice
    // (separately validated against list price), the admin form derives
    // discountPrice from this percent, so a stray 100 would still walk an
    // admin straight into a near-free discountPrice for them to not notice.
    discountPercent: z.coerce.number().min(0).max(99).nullable().optional().openapi({ example: 15 }),
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
