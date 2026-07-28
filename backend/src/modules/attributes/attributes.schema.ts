import { z } from "zod";
import { registry } from "../../docs/registry.js";
import { localizedStringSchema } from "../../lib/localized.js";

export const attributeValueTypeSchema = z.enum(["TEXT", "NUMBER", "BOOLEAN", "SELECT"]);
export type AttributeValueTypeInput = z.infer<typeof attributeValueTypeSchema>;

export const createAttributeSchema = registry.register(
  "CreateAttributeInput",
  z.object({
    categoryId: z.int().positive(),
    name: localizedStringSchema.openapi({
      example: { ka: "მასალა", en: "Material", ru: "Материал" },
    }),
    valueType: attributeValueTypeSchema,
    required: z.boolean().optional(),
  }),
);
export type CreateAttributeInput = z.infer<typeof createAttributeSchema>;

export const updateAttributeSchema = registry.register(
  "UpdateAttributeInput",
  createAttributeSchema.partial(),
);
export type UpdateAttributeInput = z.infer<typeof updateAttributeSchema>;

export const attributeIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const attributeListQuerySchema = z.object({
  categoryId: z.coerce.number().int().positive().optional(),
});
export type AttributeListQuery = z.infer<typeof attributeListQuerySchema>;

const categoryRefSchema = z.object({
  id: z.int(),
  name: localizedStringSchema,
  slug: z.string(),
});

export const attributeResponseSchema = registry.register(
  "Attribute",
  z.object({
    id: z.int().openapi({ example: 1 }),
    category: categoryRefSchema,
    name: localizedStringSchema,
    valueType: attributeValueTypeSchema,
    required: z.boolean(),
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
  }),
);
