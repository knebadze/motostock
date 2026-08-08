import { z } from "zod";
import { registry } from "../../docs/registry.js";
import { lookupItemResponseSchema } from "../lookups/lookups.schema.js";

const phoneField = z
  .string()
  .trim()
  .min(9, "ტელეფონის ნომერი არასწორია")
  .max(20, "ტელეფონის ნომერი არასწორია")
  .openapi({ example: "+995555123456" });

export const createAddressSchema = registry.register(
  "CreateAddressInput",
  z.object({
    phone: phoneField,
    cityId: z.int().positive(),
    street: z.string().trim().min(1).max(200).openapi({ example: "რუსთაველის გამზ. 12" }),
    building: z.string().trim().max(50).nullable().optional(),
    apartment: z.string().trim().max(50).nullable().optional(),
    postalCode: z.string().trim().max(20).nullable().optional(),
  }),
);
export type AddressInput = z.infer<typeof createAddressSchema>;

export const updateAddressSchema = createAddressSchema;

export const addressIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

// Extends the generic lookup shape with isTbilisi — only City needs this
// flag (used to resolve Tbilisi vs. regional delivery pricing at checkout),
// so it's kept off the shared lookupItemResponseSchema used by every other
// lookup type.
const addressCityResponseSchema = lookupItemResponseSchema.extend({
  isTbilisi: z.boolean(),
});

export const addressResponseSchema = registry.register(
  "Address",
  z.object({
    id: z.int().openapi({ example: 1 }),
    phone: z.string(),
    city: addressCityResponseSchema,
    street: z.string(),
    building: z.string().nullable(),
    apartment: z.string().nullable(),
    postalCode: z.string().nullable(),
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
  }),
);
