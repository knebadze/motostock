import { Router } from "express";
import { z } from "zod";
import { requireAuth, requireRole } from "../../middleware/auth.middleware.js";
import { validate } from "../../middleware/validate.middleware.js";
import { registry } from "../../docs/registry.js";
import { errorResponseSchema } from "../../docs/schemas.js";
import { ROLES } from "../../lib/roles.js";
import * as newsletterCampaignsController from "./newsletter-campaigns.controller.js";
import {
  campaignIdParamSchema,
  createNewsletterCampaignSchema,
  newsletterCampaignResponseSchema,
  updateNewsletterCampaignSchema,
} from "./newsletter-campaigns.schema.js";

export const newsletterCampaignsRouter = Router();

newsletterCampaignsRouter.use(requireAuth, requireRole(ROLES.ADMIN));

newsletterCampaignsRouter.get("/", newsletterCampaignsController.list);
newsletterCampaignsRouter.get(
  "/:id",
  validate(campaignIdParamSchema, "params"),
  newsletterCampaignsController.getOne,
);
newsletterCampaignsRouter.post(
  "/",
  validate(createNewsletterCampaignSchema),
  newsletterCampaignsController.create,
);
newsletterCampaignsRouter.patch(
  "/:id",
  validate(campaignIdParamSchema, "params"),
  validate(updateNewsletterCampaignSchema),
  newsletterCampaignsController.update,
);
newsletterCampaignsRouter.delete(
  "/:id",
  validate(campaignIdParamSchema, "params"),
  newsletterCampaignsController.remove,
);
newsletterCampaignsRouter.post(
  "/:id/send",
  validate(campaignIdParamSchema, "params"),
  newsletterCampaignsController.send,
);

const security = [{ cookieAuth: [] }];
const listResponse = z.object({ items: z.array(newsletterCampaignResponseSchema) });
const itemResponse = z.object({ item: newsletterCampaignResponseSchema });

registry.registerPath({
  method: "get",
  path: "/newsletter-campaigns",
  tags: ["Newsletter"],
  summary: "List newsletter campaigns (admin only)",
  security,
  responses: {
    200: { description: "Campaigns", content: { "application/json": { schema: listResponse } } },
  },
});

registry.registerPath({
  method: "get",
  path: "/newsletter-campaigns/{id}",
  tags: ["Newsletter"],
  summary: "Get a campaign by id (admin only)",
  security,
  request: { params: campaignIdParamSchema },
  responses: {
    200: { description: "Campaign", content: { "application/json": { schema: itemResponse } } },
    404: { description: "Not found", content: { "application/json": { schema: errorResponseSchema } } },
  },
});

registry.registerPath({
  method: "post",
  path: "/newsletter-campaigns",
  tags: ["Newsletter"],
  summary: "Create a draft campaign (admin only)",
  security,
  request: { body: { content: { "application/json": { schema: createNewsletterCampaignSchema } } } },
  responses: {
    201: { description: "Created", content: { "application/json": { schema: itemResponse } } },
  },
});

registry.registerPath({
  method: "patch",
  path: "/newsletter-campaigns/{id}",
  tags: ["Newsletter"],
  summary: "Edit a draft campaign — rejected once it's no longer DRAFT (admin only)",
  security,
  request: {
    params: campaignIdParamSchema,
    body: { content: { "application/json": { schema: updateNewsletterCampaignSchema } } },
  },
  responses: {
    200: { description: "Updated", content: { "application/json": { schema: itemResponse } } },
    404: { description: "Not found", content: { "application/json": { schema: errorResponseSchema } } },
    409: { description: "Not a draft", content: { "application/json": { schema: errorResponseSchema } } },
  },
});

registry.registerPath({
  method: "delete",
  path: "/newsletter-campaigns/{id}",
  tags: ["Newsletter"],
  summary: "Delete a campaign — rejected while actively SENDING (admin only)",
  security,
  request: { params: campaignIdParamSchema },
  responses: {
    204: { description: "Deleted" },
    404: { description: "Not found", content: { "application/json": { schema: errorResponseSchema } } },
    409: { description: "Currently sending", content: { "application/json": { schema: errorResponseSchema } } },
  },
});

registry.registerPath({
  method: "post",
  path: "/newsletter-campaigns/{id}/send",
  tags: ["Newsletter"],
  summary: "Send a draft campaign to every CONFIRMED subscriber (synchronous — admin only)",
  security,
  request: { params: campaignIdParamSchema },
  responses: {
    200: { description: "Send finished", content: { "application/json": { schema: itemResponse } } },
    400: { description: "Mailer not configured", content: { "application/json": { schema: errorResponseSchema } } },
    404: { description: "Not found", content: { "application/json": { schema: errorResponseSchema } } },
    409: { description: "Not a draft", content: { "application/json": { schema: errorResponseSchema } } },
  },
});
