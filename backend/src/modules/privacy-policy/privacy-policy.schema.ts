import { z } from "zod";
import { registry } from "../../docs/registry.js";

// Raw HTML from the admin's rich-text editor — no min length (the editor
// always emits at least an empty paragraph), generous max as a sanity cap
// for a long-form legal document. Mirrors terms.schema.ts's identical field.
const privacyPolicyContentSchema = z.object({
  ka: z.string().max(100000),
  en: z.string().max(100000),
  ru: z.string().max(100000),
});

export const updatePrivacyPolicySchema = registry.register(
  "UpdatePrivacyPolicyInput",
  z.object({
    content: privacyPolicyContentSchema,
  }),
);
export type UpdatePrivacyPolicyInput = z.infer<typeof updatePrivacyPolicySchema>;

export const privacyPolicyResponseSchema = registry.register(
  "PrivacyPolicy",
  z.object({
    id: z.int().openapi({ example: 1 }),
    content: privacyPolicyContentSchema,
    updatedAt: z.iso.datetime(),
  }),
);
