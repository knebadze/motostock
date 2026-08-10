import { z } from "zod";
import { registry } from "../../docs/registry.js";
import { localizedStringSchema } from "../../lib/localized.js";

export const emailTemplateKeySchema = z.enum([
  "ORDER_PLACED",
  "ORDER_CONFIRMED",
  "ORDER_SHIPPED",
  "ORDER_DELIVERED",
  "ORDER_CANCELLED",
]);
export type EmailTemplateKeyInput = z.infer<typeof emailTemplateKeySchema>;

export const emailTemplateIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

// No create/delete — exactly one row per EmailTemplateKey exists always
// (bootstrapped lazily, see the service), so only subject/body are ever
// edited.
export const updateEmailTemplateSchema = registry.register(
  "UpdateEmailTemplateInput",
  z.object({
    subject: localizedStringSchema,
    body: localizedStringSchema,
  }),
);
export type UpdateEmailTemplateInput = z.infer<typeof updateEmailTemplateSchema>;

export const emailTemplateResponseSchema = registry.register(
  "EmailTemplate",
  z.object({
    id: z.int().openapi({ example: 1 }),
    key: emailTemplateKeySchema,
    subject: localizedStringSchema,
    body: localizedStringSchema,
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
  }),
);
