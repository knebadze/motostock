import { z } from "zod";
import { registry } from "../../docs/registry.js";
import { localizedStringSchema } from "../../lib/localized.js";
import { lookupItemResponseSchema } from "../lookups/lookups.schema.js";
import { productVariantDiscountResponseSchema } from "../product-variant-discounts/product-variant-discounts.schema.js";
import { productVariantImageResponseSchema } from "../product-variant-images/product-variant-images.schema.js";
import { vehicleListingResponseSchema } from "../vehicle-listing/vehicle-listing.schema.js";

export const cartItemTypeSchema = z.enum(["PRODUCT_VARIANT", "VEHICLE_LISTING"]);

export const createCartItemSchema = registry.register(
  "CreateCartItemInput",
  z.object({
    itemType: cartItemTypeSchema,
    productVariantId: z.int().positive().nullable().optional(),
    vehicleListingId: z.int().positive().nullable().optional(),
    quantity: z.int().positive().max(99).optional().openapi({ example: 1 }),
  }),
);
export type CreateCartItemInput = z.infer<typeof createCartItemSchema>;

export const updateCartItemSchema = registry.register(
  "UpdateCartItemInput",
  z.object({
    quantity: z.int().positive().max(99).openapi({ example: 2 }),
  }),
);
export type UpdateCartItemInput = z.infer<typeof updateCartItemSchema>;

export const cartItemIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

const namedRefSchema = z.object({ id: z.int(), name: localizedStringSchema, slug: z.string() });

const cartProductVariantResponseSchema = registry.register(
  "CartProductVariant",
  z.object({
    id: z.int().openapi({ example: 1 }),
    product: z.object({
      id: z.int(),
      name: localizedStringSchema,
      slug: z.string(),
      imageUrl: z.string().nullable(),
      category: namedRefSchema,
    }),
    size: lookupItemResponseSchema.nullable(),
    color: lookupItemResponseSchema.nullable(),
    price: z.number().openapi({ example: 89.99 }),
    stockQuantity: z.int(),
    images: z.array(productVariantImageResponseSchema),
    activeDiscount: productVariantDiscountResponseSchema.nullable(),
  }),
);

export const cartItemResponseSchema = registry.register(
  "CartItem",
  z.object({
    id: z.int().openapi({ example: 1 }),
    itemType: cartItemTypeSchema,
    quantity: z.int(),
    unitPrice: z.number().openapi({ example: 89.99 }),
    lineTotal: z.number().openapi({ example: 179.98 }),
    productVariant: cartProductVariantResponseSchema.nullable(),
    vehicleListing: vehicleListingResponseSchema.nullable(),
    createdAt: z.iso.datetime(),
  }),
);

export const cartResponseSchema = registry.register(
  "Cart",
  z.object({
    items: z.array(cartItemResponseSchema),
    subtotal: z.number().openapi({ example: 179.98 }),
    itemCount: z.int().openapi({ example: 2 }),
  }),
);

export const cartCountResponseSchema = registry.register(
  "CartCount",
  z.object({ count: z.int().openapi({ example: 2 }) }),
);

// ?productVariantIds=1&productVariantIds=2 parses to a string[] via qs, but
// a single ?productVariantIds=1 parses to a bare string — normalize both
// into an array before coercing, same pattern as wishlist.schema.ts's
// idListQuerySchema.
const idListQuerySchema = z
  .preprocess(
    (value) => (value == null ? undefined : Array.isArray(value) ? value : [value]),
    z.array(z.coerce.number().int().positive()),
  )
  .optional();

export const cartStatusQuerySchema = z.object({
  productVariantIds: idListQuerySchema,
  vehicleListingIds: idListQuerySchema,
});
export type CartStatusQuery = z.infer<typeof cartStatusQuerySchema>;

export const cartStatusResponseSchema = registry.register(
  "CartStatus",
  z.object({
    items: z.array(
      z.object({
        id: z.int(),
        productVariantId: z.int().nullable(),
        vehicleListingId: z.int().nullable(),
        quantity: z.int(),
      }),
    ),
  }),
);
