import { z } from "zod";
import { registry } from "../../docs/registry.js";
import { localizedStringSchema } from "../../lib/localized.js";

export const attributeOptionAttributeIdParamSchema = z.object({
  attributeId: z.coerce.number().int().positive(),
});

export const attributeOptionIdParamSchema = z.object({
  attributeId: z.coerce.number().int().positive(),
  id: z.coerce.number().int().positive(),
});

const keyField = z
  .string()
  .trim()
  .min(1)
  .max(60)
  .regex(/^[A-Z0-9_]+$/, "მხოლოდ დიდი ლათინური ასოები, ციფრები და ქვედა ტირე")
  .openapi({ example: "LEATHER" });

export const createAttributeOptionSchema = registry.register(
  "CreateAttributeOptionInput",
  z.object({
    key: keyField,
    label: localizedStringSchema.openapi({
      example: { ka: "ტყავი", en: "Leather", ru: "Кожа" },
    }),
  }),
);
export type CreateAttributeOptionInput = z.infer<typeof createAttributeOptionSchema>;

export const updateAttributeOptionSchema = registry.register(
  "UpdateAttributeOptionInput",
  createAttributeOptionSchema.partial(),
);
export type UpdateAttributeOptionInput = z.infer<typeof updateAttributeOptionSchema>;

export const attributeOptionResponseSchema = registry.register(
  "AttributeOption",
  z.object({
    id: z.int().openapi({ example: 1 }),
    attributeId: z.int(),
    key: z.string(),
    label: localizedStringSchema,
  }),
);
