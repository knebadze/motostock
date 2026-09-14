import { z } from "zod";
import { registry } from "../../docs/registry.js";
import { localizedStringSchema } from "../../lib/localized.js";
import { MAX_DECIMAL_10_2 } from "../../lib/money.js";
import { lookupItemResponseSchema } from "../lookups/lookups.schema.js";
import { productVariantDiscountResponseSchema } from "../product-variant-discounts/product-variant-discounts.schema.js";
import { productVariantImageResponseSchema } from "../product-variant-images/product-variant-images.schema.js";

export const createProductVariantSchema = registry.register(
  "CreateProductVariantInput",
  z.object({
    productId: z.int().positive(),
    // Blank normalizes to null (not stored as "") — sku is now unique
    // (product-variant.prisma), and multiple variants leaving SKU blank
    // must never collide with each other as if they'd all set the same
    // literal empty-string SKU.
    sku: z.string().trim().max(100).transform((value) => (value === "" ? null : value)).nullable().optional(),
    finaId: z.int().positive().nullable().optional(),
    sizeId: z.int().positive().nullable().optional(),
    colorId: z.int().positive().nullable().optional(),
    price: z.coerce.number().positive().max(MAX_DECIMAL_10_2).openapi({ example: 89.99 }),
    // nonnegative, not positive — 0 is a legitimate value (out of stock,
    // kept listed rather than deactivated).
    stockQuantity: z.int().nonnegative().optional(),
    conditionId: z.int().positive().nullable().optional(),
    statusId: z.int().positive().nullable().optional(),
    isActive: z.boolean().optional(),
  }),
);
export type CreateProductVariantInput = z.infer<typeof createProductVariantSchema>;

export const updateProductVariantSchema = registry.register(
  "UpdateProductVariantInput",
  createProductVariantSchema.partial().extend({
    // The stockQuantity the admin's edit form was last showing when they
    // started editing — required alongside stockQuantity for the update to
    // be applied as a signed delta against whatever's actually in the DB
    // right now (see product-variants.service.ts's updateProductVariant)
    // instead of a plain absolute overwrite that could silently undo a
    // concurrent order's stock decrement/restore. Omitted entirely when the
    // admin didn't touch stock at all — then stockQuantity itself is also
    // omitted, and neither field is sent.
    previousStockQuantity: z.int().nonnegative().optional(),
  }),
);
export type UpdateProductVariantInput = z.infer<typeof updateProductVariantSchema>;

export const productVariantIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const productVariantListQuerySchema = z.object({
  productId: z.coerce.number().int().positive().optional(),
});
export type ProductVariantListQuery = z.infer<typeof productVariantListQuerySchema>;

const productRefSchema = z.object({ id: z.int(), name: localizedStringSchema });

export const productVariantResponseSchema = registry.register(
  "ProductVariant",
  z.object({
    id: z.int().openapi({ example: 1 }),
    product: productRefSchema,
    sku: z.string().nullable(),
    finaId: z.int().nullable(),
    size: lookupItemResponseSchema.nullable(),
    color: lookupItemResponseSchema.nullable(),
    price: z.number().openapi({ example: 89.99 }),
    stockQuantity: z.int(),
    condition: lookupItemResponseSchema.nullable(),
    status: lookupItemResponseSchema.nullable(),
    isActive: z.boolean(),
    images: z.array(productVariantImageResponseSchema),
    discounts: z.array(productVariantDiscountResponseSchema),
    activeDiscount: productVariantDiscountResponseSchema.nullable(),
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
    // Only ever present on an update response, and only when stockQuantity
    // was part of the request — true if the admin's previousStockQuantity
    // didn't match what was actually in the DB, meaning their change was
    // applied as a delta against a concurrently-changed value rather than
    // the number they started from (see updateProductVariant).
    stockConflict: z.boolean().optional(),
  }),
);
