import { z } from "zod";
import { registry } from "../../docs/registry.js";
import { localizedStringSchema } from "../../lib/localized.js";
import { attributeValueTypeSchema } from "../attributes/attributes.schema.js";

export const categoryFilterTypeSchema = z.enum(["PRICE", "BRAND", "ATTRIBUTE", "MY_VEHICLE"]);
export type CategoryFilterTypeInput = z.infer<typeof categoryFilterTypeSchema>;

export const createCategoryFilterSchema = registry.register(
  "CreateCategoryFilterInput",
  z.object({
    categoryId: z.int().positive(),
    filterType: categoryFilterTypeSchema,
    attributeId: z.int().positive().nullable().optional(),
    sortOrder: z.int().optional(),
  }),
);
export type CreateCategoryFilterInput = z.infer<typeof createCategoryFilterSchema>;

export const updateCategoryFilterSchema = registry.register(
  "UpdateCategoryFilterInput",
  z.object({ sortOrder: z.int() }),
);
export type UpdateCategoryFilterInput = z.infer<typeof updateCategoryFilterSchema>;

export const categoryFilterIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const categoryFilterListQuerySchema = z.object({
  categoryId: z.coerce.number().int().positive(),
});
export type CategoryFilterListQuery = z.infer<typeof categoryFilterListQuerySchema>;

const namedRefSchema = z.object({ id: z.int(), name: localizedStringSchema, slug: z.string() });

const attributeOptionRefSchema = z.object({
  id: z.int(),
  key: z.string(),
  label: localizedStringSchema,
});

const attributeRefSchema = z.object({
  id: z.int(),
  name: localizedStringSchema,
  valueType: attributeValueTypeSchema,
  options: z.array(attributeOptionRefSchema),
});

export const categoryFilterResponseSchema = registry.register(
  "CategoryFilterConfig",
  z.object({
    id: z.int().openapi({ example: 1 }),
    categoryId: z.int(),
    // The row's own defining category — differs from the browsed/managed
    // category when this filter was inherited from a parent category.
    category: namedRefSchema,
    filterType: categoryFilterTypeSchema,
    sortOrder: z.int(),
    // Only present for filterType = ATTRIBUTE.
    attribute: attributeRefSchema.nullable(),
  }),
);
