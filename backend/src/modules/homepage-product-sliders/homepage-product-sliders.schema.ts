import { z } from "zod";
import { registry } from "../../docs/registry.js";
import { localizedStringSchema } from "../../lib/localized.js";

export const homepageProductSliderTypeSchema = z.enum(["DISCOUNTED", "POPULAR"]);
export type HomepageProductSliderTypeInput = z.infer<typeof homepageProductSliderTypeSchema>;

export const homepageProductSliderIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

// No create/delete — exactly one row per HomepageProductSliderType exists
// always (bootstrapped lazily, see the service), so only title/active/
// order/count are ever edited.
export const updateHomepageProductSliderSchema = registry.register(
  "UpdateHomepageProductSliderInput",
  z.object({
    title: localizedStringSchema.optional(),
    isActive: z.boolean().optional(),
    sortOrder: z.int().optional(),
    itemCount: z.int().positive().max(50).optional(),
  }),
);
export type UpdateHomepageProductSliderInput = z.infer<typeof updateHomepageProductSliderSchema>;

export const homepageProductSliderResponseSchema = registry.register(
  "HomepageProductSlider",
  z.object({
    id: z.int().openapi({ example: 1 }),
    type: homepageProductSliderTypeSchema,
    title: localizedStringSchema,
    isActive: z.boolean(),
    sortOrder: z.int(),
    itemCount: z.int().openapi({ example: 10 }),
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
  }),
);
