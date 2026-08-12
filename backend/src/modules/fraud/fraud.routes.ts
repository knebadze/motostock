import { Router } from "express";
import { requireAuth, requireRole } from "../../middleware/auth.middleware.js";
import { registry } from "../../docs/registry.js";
import { ROLES } from "../../lib/roles.js";
import * as fraudController from "./fraud.controller.js";
import { suspiciousLoginActivityResponseSchema } from "./fraud.schema.js";

export const fraudRouter = Router();

fraudRouter.use(requireAuth, requireRole(ROLES.ADMIN));

fraudRouter.get("/suspicious-logins", fraudController.getSuspiciousLoginActivity);

registry.registerPath({
  method: "get",
  path: "/fraud/suspicious-logins",
  tags: ["Fraud"],
  summary: "Accounts/IPs with failed-login activity over the configured threshold in the recent window (admin only)",
  security: [{ cookieAuth: [] }],
  responses: {
    200: {
      description: "Suspicious login activity",
      content: { "application/json": { schema: suspiciousLoginActivityResponseSchema } },
    },
  },
});
