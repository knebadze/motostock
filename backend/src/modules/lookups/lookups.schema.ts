import { z } from "zod";
import { registry } from "../../docs/registry.js";
import { LOOKUP_TYPES } from "./lookups.registry.js";

export const lookupTypeParamSchema = z.object({
  type: z.enum(LOOKUP_TYPES),
});

export const lookupIdParamSchema = z.object({
  type: z.enum(LOOKUP_TYPES),
  id: z.coerce.number().int().positive(),
});

const keyField = z
  .string()
  .min(1)
  .max(60)
  .regex(/^[A-Z0-9_]+$/, "მხოლოდ დიდი ლათინური ასოები, ციფრები და ქვედა ტირე")
  .openapi({ example: "PETROL" });

export const createLookupItemSchema = registry.register(
  "CreateLookupItemInput",
  z.object({
    key: keyField,
    nameKa: z.string().min(1).openapi({ example: "ბენზინი" }),
    nameEn: z.string().min(1).openapi({ example: "Petrol" }),
    nameRu: z.string().min(1).openapi({ example: "Бензин" }),
  }),
);
export type CreateLookupItemInput = z.infer<typeof createLookupItemSchema>;

export const updateLookupItemSchema = registry.register(
  "UpdateLookupItemInput",
  createLookupItemSchema.partial(),
);
export type UpdateLookupItemInput = z.infer<typeof updateLookupItemSchema>;

export const lookupItemResponseSchema = registry.register(
  "LookupItem",
  z.object({
    id: z.int().openapi({ example: 1 }),
    key: z.string(),
    nameKa: z.string(),
    nameEn: z.string(),
    nameRu: z.string(),
  }),
);
