import { z } from "zod";
import { registry } from "../../docs/registry.js";
import { productResponseSchema } from "../products/products.schema.js";

export const productBuyTogetherProductIdParamSchema = z.object({
  productId: z.coerce.number().int().positive(),
});

export const productBuyTogetherIdParamSchema = z.object({
  productId: z.coerce.number().int().positive(),
  id: z.coerce.number().int().positive(),
});

export const createProductBuyTogetherSchema = registry.register(
  "CreateProductBuyTogetherInput",
  z.object({
    relatedProductId: z.int().positive(),
  }),
);
export type CreateProductBuyTogetherInput = z.infer<typeof createProductBuyTogetherSchema>;

export const productBuyTogetherResponseSchema = registry.register(
  "ProductBuyTogether",
  z.object({
    id: z.int().openapi({ example: 1 }),
    productId: z.int(),
    relatedProduct: productResponseSchema,
    createdAt: z.iso.datetime(),
  }),
);
