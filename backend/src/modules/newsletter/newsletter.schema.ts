import { z } from "zod";
import { registry } from "../../docs/registry.js";
import { emailSchema } from "../../lib/email.js";

export const subscribeSchema = registry.register(
  "NewsletterSubscribeInput",
  z.object({ email: emailSchema.openapi({ example: "rider@motostock.ge" }) }),
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

// page/pageSize both optional (defaults applied in the service, not via
// zod's `.default()`) — same reasoning as users.schema.ts's
// listUsersQuerySchema: an output key zod infers as required-but-defaulted
// breaks Express's route handler overload resolution against the default
// ParsedQs query type.
export const listSubscribersQuerySchema = z.object({
  status: newsletterSubscriberStatusSchema.optional(),
  search: z.string().trim().min(1).max(200).optional(),
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(100).optional(),
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

// Real server-side pagination (skip/take), same pattern as
// users.schema.ts's AdminUsersPage — the subscriber list only grows, so
// fetching everyone up front and slicing client-side doesn't scale.
export const newsletterSubscribersPageResponseSchema = registry.register(
  "NewsletterSubscribersPage",
  z.object({
    items: z.array(newsletterSubscriberResponseSchema),
    total: z.int(),
    page: z.int(),
    pageSize: z.int(),
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
