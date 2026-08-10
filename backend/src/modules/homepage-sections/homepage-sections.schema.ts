import { z } from "zod";
import { registry } from "../../docs/registry.js";
import { localizedStringSchema } from "../../lib/localized.js";

export const homepageSectionTypeSchema = z.enum([
  "DISCOUNTED_PRODUCTS",
  "POPULAR_PRODUCTS",
  "DISCOUNTED_VEHICLES",
  "POPULAR_VEHICLES",
  "DISCOUNTED_MIXED",
  "POPULAR_MIXED",
  "CATEGORIES",
]);
export type HomepageSectionTypeInput = z.infer<typeof homepageSectionTypeSchema>;

export const homepageSectionIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

// No create/delete — exactly one row per HomepageSectionType exists always
// (bootstrapped lazily, see the service), so only title/active/order/count
// are ever edited.
export const updateHomepageSectionSchema = registry.register(
  "UpdateHomepageSectionInput",
  z.object({
    title: localizedStringSchema.optional(),
    isActive: z.boolean().optional(),
    sortOrder: z.int().optional(),
    itemCount: z.int().positive().max(50).optional(),
    // Only meaningful for DISCOUNTED_MIXED/POPULAR_MIXED — those combine
    // products and vehicle listings in one carousel and need separate
    // counts instead of the shared itemCount above.
    productItemCount: z.int().positive().max(50).optional(),
    vehicleItemCount: z.int().positive().max(50).optional(),
  }),
);
export type UpdateHomepageSectionInput = z.infer<typeof updateHomepageSectionSchema>;

export const homepageSectionResponseSchema = registry.register(
  "HomepageSection",
  z.object({
    id: z.int().openapi({ example: 1 }),
    type: homepageSectionTypeSchema,
    title: localizedStringSchema,
    isActive: z.boolean(),
    sortOrder: z.int(),
    itemCount: z.int().openapi({ example: 10 }),
    productItemCount: z.int().nullable().openapi({ example: 5 }),
    vehicleItemCount: z.int().nullable().openapi({ example: 5 }),
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
  }),
);
