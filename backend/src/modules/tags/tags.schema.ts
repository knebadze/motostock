import { z } from "zod";
import { registry } from "../../docs/registry.js";
import { localizedStringSchema } from "../../lib/localized.js";

const nameField = z.string().trim().min(2).max(60).openapi({ example: "ზეთის შეცვლა" });
const descriptionField = z.string().trim().max(300).nullable().optional().openapi({ example: "ზეთის შეცვლის კომპლექტი" });

export const createTagSchema = registry.register(
  "CreateTagInput",
  z.object({
    name: nameField,
    description: descriptionField,
    isActive: z.boolean().optional(),
  }),
);
export type CreateTagInput = z.infer<typeof createTagSchema>;

export const updateTagSchema = registry.register("UpdateTagInput", createTagSchema.partial());
export type UpdateTagInput = z.infer<typeof updateTagSchema>;

export const tagIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const productIdParamSchema = z.object({
  productId: z.coerce.number().int().positive(),
});

export const setProductTagsSchema = registry.register(
  "SetProductTagsInput",
  z.object({
    // Replaces the product's whole tag set.
    tagIds: z.array(z.int().positive()).max(50),
  }),
);
export type SetProductTagsInput = z.infer<typeof setProductTagsSchema>;

// Bulk assign/remove from the admin products list (selected rows).
export const bulkTagProductsSchema = registry.register(
  "BulkTagProductsInput",
  z.object({
    productIds: z.array(z.int().positive()).min(1).max(500),
  }),
);
export type BulkTagProductsInput = z.infer<typeof bulkTagProductsSchema>;

export const tagResponseSchema = registry.register(
  "Tag",
  z.object({
    id: z.int().openapi({ example: 1 }),
    name: z.string(),
    description: z.string().nullable(),
    isActive: z.boolean(),
    productCount: z.int(),
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
  }),
);

export const bulkTagProductsResponseSchema = registry.register(
  "BulkTagProductsResult",
  z.object({
    // Rows actually added/removed (already-tagged / not-tagged ones are no-ops).
    changed: z.int(),
    tag: tagResponseSchema,
  }),
);

export const productTagRefSchema = registry.register(
  "ProductTagRef",
  z.object({ id: z.int(), name: z.string(), isActive: z.boolean() }),
);

export const tagProductSchema = registry.register(
  "TagProduct",
  z.object({
    id: z.int(),
    name: localizedStringSchema,
    slug: z.string(),
    imageUrl: z.string().nullable(),
    category: z.object({ id: z.int(), name: localizedStringSchema, slug: z.string() }),
  }),
);
