import { Router } from "express";
import { z } from "zod";
import { requireAuth, requireRole } from "../../middleware/auth.middleware.js";
import { validate } from "../../middleware/validate.middleware.js";
import { registry } from "../../docs/registry.js";
import { errorResponseSchema } from "../../docs/schemas.js";
import { ROLES } from "../../lib/roles.js";
import * as emailTemplatesController from "./email-templates.controller.js";
import {
  emailTemplateIdParamSchema,
  emailTemplateResponseSchema,
  updateEmailTemplateSchema,
} from "./email-templates.schema.js";

export const emailTemplatesRouter = Router();

// Admin-only end to end — unlike CompanyInfo/HomepageSection/Terms, nothing
// here is ever read by a guest-facing page; templates only get rendered
// server-side when an order event fires (see email-templates.service.ts's
// sendEmailTemplate).
emailTemplatesRouter.use(requireAuth, requireRole(ROLES.ADMIN));

emailTemplatesRouter.get("/", emailTemplatesController.list);
emailTemplatesRouter.patch(
  "/:id",
  validate(emailTemplateIdParamSchema, "params"),
  validate(updateEmailTemplateSchema),
  emailTemplatesController.update,
);

const security = [{ cookieAuth: [] }];
const listResponse = z.object({ items: z.array(emailTemplateResponseSchema) });
const itemResponse = z.object({ item: emailTemplateResponseSchema });

registry.registerPath({
  method: "get",
  path: "/email-templates",
  tags: ["EmailTemplates"],
  summary: "List every email template (admin only)",
  security,
  responses: {
    200: { description: "Templates", content: { "application/json": { schema: listResponse } } },
  },
});

registry.registerPath({
  method: "patch",
  path: "/email-templates/{id}",
  tags: ["EmailTemplates"],
  summary: "Update an email template's subject/body",
  security,
  request: {
    params: emailTemplateIdParamSchema,
    body: { content: { "application/json": { schema: updateEmailTemplateSchema } } },
  },
  responses: {
    200: { description: "Updated", content: { "application/json": { schema: itemResponse } } },
    404: { description: "Not found", content: { "application/json": { schema: errorResponseSchema } } },
  },
});
