import { Router } from "express";
import { z } from "zod";
import { requireAuth, requireRole } from "../../middleware/auth.middleware.js";
import { validate } from "../../middleware/validate.middleware.js";
import { newsletterRateLimit } from "../../middleware/rateLimit.middleware.js";
import { registry } from "../../docs/registry.js";
import { errorResponseSchema } from "../../docs/schemas.js";
import { ROLES } from "../../lib/roles.js";
import * as newsletterController from "./newsletter.controller.js";
import {
  confirmSubscriptionSchema,
  listSubscribersQuerySchema,
  newsletterSubscriberCountsResponseSchema,
  newsletterSubscribersPageResponseSchema,
  subscribeSchema,
  subscriberIdParamSchema,
  unsubscribeSchema,
} from "./newsletter.schema.js";

export const newsletterRouter = Router();

// Public — the footer signup form + the confirm/unsubscribe landing pages
// (see the frontend's /newsletter/confirm and /newsletter/unsubscribe,
// which POST the token from the email link on mount, same pattern as
// /reset-password).
newsletterRouter.post(
  "/subscribe",
  newsletterRateLimit,
  validate(subscribeSchema),
  newsletterController.subscribe,
);
newsletterRouter.post("/confirm", validate(confirmSubscriptionSchema), newsletterController.confirm);
newsletterRouter.post(
  "/unsubscribe",
  validate(unsubscribeSchema),
  newsletterController.unsubscribe,
);

newsletterRouter.use("/subscribers", requireAuth, requireRole(ROLES.ADMIN));
newsletterRouter.get(
  "/subscribers",
  validate(listSubscribersQuerySchema, "query"),
  newsletterController.listSubscribers,
);
newsletterRouter.get("/subscribers/counts", newsletterController.getSubscriberCounts);
newsletterRouter.delete(
  "/subscribers/:id",
  validate(subscriberIdParamSchema, "params"),
  newsletterController.deleteSubscriber,
);

const security = [{ cookieAuth: [] }];
const okResponse = z.object({ ok: z.boolean() });

registry.registerPath({
  method: "post",
  path: "/newsletter/subscribe",
  tags: ["Newsletter"],
  summary: "Subscribe an email to the newsletter (double opt-in — sends a confirmation email)",
  request: { body: { content: { "application/json": { schema: subscribeSchema } } } },
  responses: {
    200: { description: "Confirmation email sent (or already subscribed)", content: { "application/json": { schema: okResponse } } },
    400: { description: "Mailer not configured", content: { "application/json": { schema: errorResponseSchema } } },
  },
});

registry.registerPath({
  method: "post",
  path: "/newsletter/confirm",
  tags: ["Newsletter"],
  summary: "Confirm a newsletter subscription via the emailed token",
  request: { body: { content: { "application/json": { schema: confirmSubscriptionSchema } } } },
  responses: {
    200: { description: "Confirmed", content: { "application/json": { schema: okResponse } } },
    400: { description: "Invalid or already-used token", content: { "application/json": { schema: errorResponseSchema } } },
  },
});

registry.registerPath({
  method: "post",
  path: "/newsletter/unsubscribe",
  tags: ["Newsletter"],
  summary: "Unsubscribe via the token embedded in every sent campaign's footer link",
  request: { body: { content: { "application/json": { schema: unsubscribeSchema } } } },
  responses: {
    200: { description: "Unsubscribed (idempotent)", content: { "application/json": { schema: okResponse } } },
    400: { description: "Invalid token", content: { "application/json": { schema: errorResponseSchema } } },
  },
});

registry.registerPath({
  method: "get",
  path: "/newsletter/subscribers",
  tags: ["Newsletter"],
  summary: "List newsletter subscribers, optionally filtered by status/search (admin only)",
  security,
  request: { query: listSubscribersQuerySchema },
  responses: {
    200: {
      description: "Subscribers",
      content: { "application/json": { schema: newsletterSubscribersPageResponseSchema } },
    },
  },
});

registry.registerPath({
  method: "get",
  path: "/newsletter/subscribers/counts",
  tags: ["Newsletter"],
  summary: "Subscriber counts by status (admin only)",
  security,
  responses: {
    200: { description: "Counts", content: { "application/json": { schema: newsletterSubscriberCountsResponseSchema } } },
  },
});

registry.registerPath({
  method: "delete",
  path: "/newsletter/subscribers/{id}",
  tags: ["Newsletter"],
  summary: "Remove a subscriber (admin only)",
  security,
  request: { params: subscriberIdParamSchema },
  responses: {
    204: { description: "Deleted" },
    404: { description: "Not found", content: { "application/json": { schema: errorResponseSchema } } },
  },
});
