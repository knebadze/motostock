import { z } from "zod";
import { registry } from "../../docs/registry.js";
import { lookupItemResponseSchema } from "../lookups/lookups.schema.js";

const phoneField = z
  .string()
  .trim()
  .min(9, "ტელეფონის ნომერი არასწორია")
  .max(20, "ტელეფონის ნომერი არასწორია")
  .openapi({ example: "+995555123456" });

export const upsertAddressSchema = registry.register(
  "UpsertAddressInput",
  z.object({
    phone: phoneField,
    cityId: z.int().positive(),
    street: z.string().trim().min(1).max(200).openapi({ example: "რუსთაველის გამზ. 12" }),
    building: z.string().trim().max(50).nullable().optional(),
    apartment: z.string().trim().max(50).nullable().optional(),
    postalCode: z.string().trim().max(20).nullable().optional(),
  }),
);
export type UpsertAddressInput = z.infer<typeof upsertAddressSchema>;

export const addressResponseSchema = registry.register(
  "Address",
  z.object({
    id: z.int().openapi({ example: 1 }),
    phone: z.string(),
    city: lookupItemResponseSchema,
    street: z.string(),
    building: z.string().nullable(),
    apartment: z.string().nullable(),
    postalCode: z.string().nullable(),
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
  }),
);
