import { z } from "zod";
import { registry } from "../../docs/registry.js";
import { productResponseSchema } from "../products/products.schema.js";
import { vehicleListingResponseSchema } from "../vehicle-listing/vehicle-listing.schema.js";

export const wishlistItemTypeSchema = z.enum(["PRODUCT", "VEHICLE_LISTING"]);

export const createWishlistItemSchema = registry.register(
  "CreateWishlistItemInput",
  z.object({
    itemType: wishlistItemTypeSchema,
    productId: z.int().positive().nullable().optional(),
    vehicleListingId: z.int().positive().nullable().optional(),
  }),
);
export type CreateWishlistItemInput = z.infer<typeof createWishlistItemSchema>;

export const wishlistItemIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

// ?productIds=1&productIds=2 parses to a string[] via qs, but a single
// ?productIds=1 parses to a bare string — normalize both into an array
// before coercing each entry to a number (same pattern as brandIds on the
// product/vehicle-listing list queries).
const idListQuerySchema = z
  .preprocess(
    (value) => (value == null ? undefined : Array.isArray(value) ? value : [value]),
    z.array(z.coerce.number().int().positive()),
  )
  .optional();

export const wishlistStatusQuerySchema = z.object({
  productIds: idListQuerySchema,
  vehicleListingIds: idListQuerySchema,
});
export type WishlistStatusQuery = z.infer<typeof wishlistStatusQuerySchema>;

export const wishlistItemResponseSchema = registry.register(
  "WishlistItem",
  z.object({
    id: z.int().openapi({ example: 1 }),
    itemType: wishlistItemTypeSchema,
    product: productResponseSchema.nullable(),
    vehicleListing: vehicleListingResponseSchema.nullable(),
    createdAt: z.iso.datetime(),
  }),
);

export const wishlistStatusResponseSchema = registry.register(
  "WishlistStatus",
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

export const wishlistCountResponseSchema = registry.register(
  "WishlistCount",
  z.object({ count: z.int().openapi({ example: 2 }) }),
);
