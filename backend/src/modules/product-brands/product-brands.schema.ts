import { z } from "zod";
import { registry } from "../../docs/registry.js";
import { localizedStringSchema } from "../../lib/localized.js";

const slugField = z
  .string()
  .min(1)
  .max(120)
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "მხოლოდ პატარა ლათინური ასოები, ციფრები და დეფისი")
  .openapi({ example: "agv" });

const nameField = z.string().min(1).max(120).openapi({ example: "AGV" });

export const createProductBrandSchema = registry.register(
  "CreateProductBrandInput",
  z.object({
    categoryId: z.int().positive(),
    name: nameField,
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
    name: nameField,
    slug: z.string().openapi({ example: "agv" }),
    logoUrl: z.string().nullable(),
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
  }),
);
