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
  }),
);
export type CreateCategoryFilterInput = z.infer<typeof createCategoryFilterSchema>;

export const updateCategoryFilterSchema = registry.register(
  "UpdateCategoryFilterInput",
  // Either or both: reorder, and/or switch the filter on/off in the shop.
  z
    .object({ sortOrder: z.int().optional(), isActive: z.boolean().optional() })
    .refine((input) => input.sortOrder !== undefined || input.isActive !== undefined, {
      message: "მიუთითეთ sortOrder ან isActive",
    }),
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
  // Storefront list only: how many products on the page hold this option.
  count: z.int().optional(),
});

const attributeRefSchema = z.object({
  id: z.int(),
  name: localizedStringSchema,
  valueType: attributeValueTypeSchema,
  options: z.array(attributeOptionRefSchema),
  // The rest are storefront-list only (GET /category-filters/storefront).
  unit: localizedStringSchema.nullable().optional(),
  // NUMBER: smallest/largest value the page's products hold.
  range: z.object({ min: z.number(), max: z.number() }).nullable().optional(),
  // BOOLEAN: how many products have it.
  trueCount: z.int().optional(),
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
    // Off = not shown in the shop (see CategoryFilterConfig.isActive).
    isActive: z.boolean(),
    // Only present for filterType = ATTRIBUTE.
    attribute: attributeRefSchema.nullable(),
  }),
);
