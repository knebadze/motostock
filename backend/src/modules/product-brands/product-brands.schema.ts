import { z } from "zod";
import { registry } from "../../docs/registry.js";
import { localizedStringSchema } from "../../lib/localized.js";

const slugField = z
  .string()
  .min(1)
  .max(120)
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "მხოლოდ პატარა ლათინური ასოები, ციფრები და დეფისი")
  .openapi({ example: "agv" });

export const createProductBrandSchema = registry.register(
  "CreateProductBrandInput",
  z.object({
    categoryId: z.int().positive(),
    name: localizedStringSchema.openapi({
      example: { ka: "AGV", en: "AGV", ru: "AGV" },
    }),
    slug: slugField,
  }),
);
export type CreateProductBrandInput = z.infer<typeof createProductBrandSchema>;

export const updateProductBrandSchema = registry.register(
  "UpdateProductBrandInput",
  createProductBrandSchema.partial(),
);
export type UpdateProductBrandInput = z.infer<typeof updateProductBrandSchema>;

export const productBrandIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const productBrandListQuerySchema = z.object({
  categoryId: z.coerce.number().int().positive().optional(),
});
export type ProductBrandListQuery = z.infer<typeof productBrandListQuerySchema>;

const categoryRefSchema = z.object({
  id: z.int(),
  name: localizedStringSchema,
  slug: z.string(),
});

export const productBrandResponseSchema = registry.register(
  "ProductBrand",
  z.object({
    id: z.int().openapi({ example: 1 }),
    category: categoryRefSchema,
    name: localizedStringSchema,
    slug: z.string().openapi({ example: "agv" }),
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
  }),
);
