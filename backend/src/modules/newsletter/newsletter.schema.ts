import { z } from "zod";
import { registry } from "../../docs/registry.js";

export const subscribeSchema = registry.register(
  "NewsletterSubscribeInput",
  z.object({ email: z.email().openapi({ example: "rider@motostock.ge" }) }),
);
export type SubscribeInput = z.infer<typeof subscribeSchema>;

export const confirmSubscriptionSchema = registry.register(
  "NewsletterConfirmInput",
  z.object({ token: z.string().min(1) }),
);
export type ConfirmSubscriptionInput = z.infer<typeof confirmSubscriptionSchema>;

export const unsubscribeSchema = registry.register(
  "NewsletterUnsubscribeInput",
  z.object({ token: z.string().min(1) }),
);
export type UnsubscribeInput = z.infer<typeof unsubscribeSchema>;

export const newsletterSubscriberStatusSchema = z.enum(["PENDING", "CONFIRMED", "UNSUBSCRIBED"]);

export const listSubscribersQuerySchema = z.object({
  status: newsletterSubscriberStatusSchema.optional(),
  search: z.string().trim().min(1).max(200).optional(),
});
export type ListSubscribersQuery = z.infer<typeof listSubscribersQuerySchema>;

export const subscriberIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const newsletterSubscriberResponseSchema = registry.register(
  "NewsletterSubscriber",
  z.object({
    id: z.int().openapi({ example: 1 }),
    email: z.string(),
    status: newsletterSubscriberStatusSchema,
    confirmedAt: z.iso.datetime().nullable(),
    unsubscribedAt: z.iso.datetime().nullable(),
    createdAt: z.iso.datetime(),
  }),
);

export const newsletterSubscriberCountsResponseSchema = registry.register(
  "NewsletterSubscriberCounts",
  z.object({
    pending: z.int(),
    confirmed: z.int(),
    unsubscribed: z.int(),
  }),
);
