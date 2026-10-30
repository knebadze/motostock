import { z } from "zod";
import { registry } from "../../docs/registry.js";

// Raw HTML from the admin's rich-text editor — no min length (the editor
// always emits at least an empty paragraph), generous max as a sanity cap
// for a long-form legal document. Mirrors terms.schema.ts's identical field.
const shippingPolicyContentSchema = z.object({
  ka: z.string().max(100000),
  en: z.string().max(100000),
  ru: z.string().max(100000),
});

export const updateShippingPolicySchema = registry.register(
  "UpdateShippingPolicyInput",
  z.object({
    content: shippingPolicyContentSchema,
  }),
);
export type UpdateShippingPolicyInput = z.infer<typeof updateShippingPolicySchema>;

export const shippingPolicyResponseSchema = registry.register(
  "ShippingPolicy",
  z.object({
    id: z.int().openapi({ example: 1 }),
    content: shippingPolicyContentSchema,
    updatedAt: z.iso.datetime(),
  }),
);
