import { z } from "zod";
import { registry } from "../../docs/registry.js";

export const productVariantDiscountVariantIdParamSchema = z.object({
  variantId: z.coerce.number().int().positive(),
});

export const productVariantDiscountIdParamSchema = z.object({
  variantId: z.coerce.number().int().positive(),
  id: z.coerce.number().int().positive(),
});

export const createProductVariantDiscountSchema = registry.register(
  "CreateProductVariantDiscountInput",
  z.object({
    discountPrice: z.coerce.number().positive().openapi({ example: 89.99 }),
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
export type CreateProductVariantDiscountInput = z.infer<typeof createProductVariantDiscountSchema>;

export const updateProductVariantDiscountSchema = registry.register(
  "UpdateProductVariantDiscountInput",
  createProductVariantDiscountSchema.partial(),
);
export type UpdateProductVariantDiscountInput = z.infer<
  typeof updateProductVariantDiscountSchema
>;

export const productVariantDiscountResponseSchema = registry.register(
  "ProductVariantDiscount",
  z.object({
    id: z.int().openapi({ example: 1 }),
    productVariantId: z.int(),
    discountPrice: z.number().openapi({ example: 89.99 }),
    discountPercent: z.number().nullable().openapi({ example: 15 }),
    startDate: z.iso.date(),
    endDate: z.iso.date(),
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
  }),
);
