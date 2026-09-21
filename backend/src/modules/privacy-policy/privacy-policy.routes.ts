import { Router } from "express";
import { z } from "zod";
import { requireAuth, requireRole } from "../../middleware/auth.middleware.js";
import { validate } from "../../middleware/validate.middleware.js";
import { registry } from "../../docs/registry.js";
import { errorResponseSchema } from "../../docs/schemas.js";
import { ROLES } from "../../lib/roles.js";
import * as privacyPolicyController from "./privacy-policy.controller.js";
import { privacyPolicyResponseSchema, updatePrivacyPolicySchema } from "./privacy-policy.schema.js";

export const privacyPolicyRouter = Router();

// Public: the guest /privacy page reads this on every load — none of it is
// sensitive, it's meant for public display. Same public-GET/admin-write
// pattern as terms.routes.ts/company-info.routes.ts.
privacyPolicyRouter.get("/", privacyPolicyController.getOne);

privacyPolicyRouter.use(requireAuth, requireRole(ROLES.ADMIN));

privacyPolicyRouter.patch("/", validate(updatePrivacyPolicySchema), privacyPolicyController.update);

const security = [{ cookieAuth: [] }];
const privacyPolicyWrapperResponse = z.object({ privacyPolicy: privacyPolicyResponseSchema });

registry.registerPath({
  method: "get",
  path: "/privacy-policy",
  tags: ["PrivacyPolicy"],
  summary: "Get the privacy policy content (public)",
  responses: {
    200: {
      description: "Privacy policy",
      content: { "application/json": { schema: privacyPolicyWrapperResponse } },
    },
  },
});

registry.registerPath({
  method: "patch",
  path: "/privacy-policy",
  tags: ["PrivacyPolicy"],
  summary: "Update the privacy policy content (admin only)",
  security,
  request: { body: { content: { "application/json": { schema: updatePrivacyPolicySchema } } } },
  responses: {
    200: { description: "Updated", content: { "application/json": { schema: privacyPolicyWrapperResponse } } },
    401: { description: "Not authenticated", content: { "application/json": { schema: errorResponseSchema } } },
    403: { description: "Insufficient permissions", content: { "application/json": { schema: errorResponseSchema } } },
  },
});
