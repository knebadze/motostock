import { z } from "zod";
import { registry } from "../../docs/registry.js";

// Raw HTML from the admin's rich-text editor — no min length (the editor
// always emits at least an empty paragraph), generous max as a sanity cap
// for a long-form legal document.
const termsContentSchema = z.object({
  ka: z.string().max(100000),
  en: z.string().max(100000),
  ru: z.string().max(100000),
});

export const updateTermsSchema = registry.register(
  "UpdateTermsInput",
  z.object({
    content: termsContentSchema,
  }),
);
export type UpdateTermsInput = z.infer<typeof updateTermsSchema>;

export const termsResponseSchema = registry.register(
  "TermsAndConditions",
  z.object({
    id: z.int().openapi({ example: 1 }),
    content: termsContentSchema,
    updatedAt: z.iso.datetime(),
  }),
);
