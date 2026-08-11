import { z } from "zod";
import { registry } from "../../docs/registry.js";
import { productResponseSchema } from "../products/products.schema.js";
import { vehicleListingResponseSchema } from "../vehicle-listing/vehicle-listing.schema.js";

export const compareItemTypeSchema = z.enum(["PRODUCT", "VEHICLE_LISTING"]);

export const createCompareItemSchema = registry.register(
  "CreateCompareItemInput",
  z.object({
    itemType: compareItemTypeSchema,
    productId: z.int().positive().nullable().optional(),
    vehicleListingId: z.int().positive().nullable().optional(),
  }),
);
export type CreateCompareItemInput = z.infer<typeof createCompareItemSchema>;

export const compareItemIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

// ?productIds=1&productIds=2 parses to a string[] via qs, but a single
// ?productIds=1 parses to a bare string — normalize both into an array
// before coercing each entry to a number (same pattern as wishlist.schema.ts).
const idListQuerySchema = z
  .preprocess(
    (value) => (value == null ? undefined : Array.isArray(value) ? value : [value]),
    z.array(z.coerce.number().int().positive()),
  )
  .optional();

export const compareStatusQuerySchema = z.object({
  productIds: idListQuerySchema,
  vehicleListingIds: idListQuerySchema,
});
export type CompareStatusQuery = z.infer<typeof compareStatusQuerySchema>;

export const compareItemResponseSchema = registry.register(
  "CompareItem",
  z.object({
    id: z.int().openapi({ example: 1 }),
    itemType: compareItemTypeSchema,
    product: productResponseSchema.nullable(),
    vehicleListing: vehicleListingResponseSchema.nullable(),
    createdAt: z.iso.datetime(),
  }),
);

export const compareStatusResponseSchema = registry.register(
  "CompareStatus",
  z.object({
    items: z.array(
      z.object({
        id: z.int(),
        productId: z.int().nullable(),
        vehicleListingId: z.int().nullable(),
      }),
    ),
  }),
);
