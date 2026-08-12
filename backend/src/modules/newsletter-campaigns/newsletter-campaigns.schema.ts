import { z } from "zod";
import { registry } from "../../docs/registry.js";

export const newsletterCampaignStatusSchema = z.enum(["DRAFT", "SENDING", "SENT", "FAILED"]);

export const createNewsletterCampaignSchema = registry.register(
  "CreateNewsletterCampaignInput",
  z.object({
    subject: z.string().trim().min(1).max(200),
    body: z.string().trim().min(1),
  }),
);
export type CreateNewsletterCampaignInput = z.infer<typeof createNewsletterCampaignSchema>;

export const updateNewsletterCampaignSchema = createNewsletterCampaignSchema;
export type UpdateNewsletterCampaignInput = z.infer<typeof updateNewsletterCampaignSchema>;

export const campaignIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const newsletterCampaignResponseSchema = registry.register(
  "NewsletterCampaign",
  z.object({
    id: z.int().openapi({ example: 1 }),
    subject: z.string(),
    body: z.string(),
    status: newsletterCampaignStatusSchema,
    recipientCount: z.int(),
    failedCount: z.int(),
    sentAt: z.iso.datetime().nullable(),
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
  }),
);

export const sendNewsletterCampaignResponseSchema = registry.register(
  "SendNewsletterCampaignResponse",
  z.object({
    item: newsletterCampaignResponseSchema,
  }),
);
