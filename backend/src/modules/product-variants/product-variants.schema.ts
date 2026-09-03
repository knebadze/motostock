import { z } from "zod";
import { registry } from "../../docs/registry.js";
import { localizedStringSchema } from "../../lib/localized.js";
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
    price: z.coerce.number().positive().openapi({ example: 89.99 }),
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
  createProductVariantSchema.partial(),
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
  }),
);
