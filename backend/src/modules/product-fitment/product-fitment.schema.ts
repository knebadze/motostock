import { z } from "zod";
import { registry } from "../../docs/registry.js";
import { localizedStringSchema } from "../../lib/localized.js";

export const productFitmentProductIdParamSchema = z.object({
  productId: z.coerce.number().int().positive(),
});

export const productFitmentIdParamSchema = z.object({
  productId: z.coerce.number().int().positive(),
  id: z.coerce.number().int().positive(),
});

export const createProductFitmentSchema = registry.register(
  "CreateProductFitmentInput",
  z.object({
    vehicleCatalogId: z.int().positive(),
  }),
);
export type CreateProductFitmentInput = z.infer<typeof createProductFitmentSchema>;

const namedRefSchema = z.object({ id: z.int(), name: localizedStringSchema, slug: z.string() });

export const productFitmentResponseSchema = registry.register(
  "ProductFitment",
  z.object({
    id: z.int().openapi({ example: 1 }),
    productId: z.int(),
    vehicleCatalog: z.object({
      id: z.int(),
      brand: namedRefSchema,
      model: namedRefSchema,
      variant: z.string(),
      yearFrom: z.int().nullable(),
      yearTo: z.int().nullable(),
    }),
    createdAt: z.iso.datetime(),
  }),
);
