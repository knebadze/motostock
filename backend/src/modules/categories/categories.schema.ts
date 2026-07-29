import { z } from "zod";
import { registry } from "../../docs/registry.js";
import { localizedStringSchema } from "../../lib/localized.js";

const slugField = z
  .string()
  .min(1)
  .max(120)
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "მხოლოდ პატარა ლათინური ასოები, ციფრები და დეფისი")
  .openapi({ example: "helmets" });

const localizedNameField = localizedStringSchema.openapi({
  example: { ka: "ჩაფხუტები", en: "Helmets", ru: "Шлемы" },
});

export const createCategorySchema = registry.register(
  "CreateCategoryInput",
  z.object({
    name: localizedNameField,
    slug: slugField,
    parentId: z.int().positive().nullable().optional().openapi({ example: null }),
    sortOrder: z.int().optional().openapi({ example: 0 }),
  }),
);
export type CreateCategoryInput = z.infer<typeof createCategorySchema>;

export const updateCategorySchema = registry.register(
  "UpdateCategoryInput",
  createCategorySchema.partial(),
);
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;

export const categoryIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});
export type CategoryIdParam = z.infer<typeof categoryIdParamSchema>;

export const categoryResponseSchema = registry.register(
  "Category",
  z.object({
    id: z.int().openapi({ example: 1 }),
    name: localizedNameField,
    slug: z.string().openapi({ example: "helmets" }),
    imageUrl: z.string().nullable().openapi({ example: "/uploads/categories/123.jpg" }),
    bannerImageUrl: z.string().nullable().openapi({ example: "/uploads/categories-banner/123.jpg" }),
    sortOrder: z.int().openapi({ example: 0 }),
    parentId: z.int().nullable(),
    parent: z
      .object({ id: z.int(), name: localizedStringSchema })
      .nullable()
      .optional(),
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
  }),
);
