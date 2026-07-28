import { z } from "zod";
import { registry } from "../../docs/registry.js";

export const productVariantImageVariantIdParamSchema = z.object({
  variantId: z.coerce.number().int().positive(),
});

export const productVariantImageIdParamSchema = z.object({
  variantId: z.coerce.number().int().positive(),
  imageId: z.coerce.number().int().positive(),
});

export const reorderProductVariantImagesSchema = registry.register(
  "ReorderProductVariantImagesInput",
  z.object({
    imageIds: z.array(z.int().positive()).min(1),
  }),
);
export type ReorderProductVariantImagesInput = z.infer<typeof reorderProductVariantImagesSchema>;

export const productVariantImageResponseSchema = registry.register(
  "ProductVariantImage",
  z.object({
    id: z.int().openapi({ example: 1 }),
    imageUrl: z.string(),
    position: z.int(),
  }),
);
