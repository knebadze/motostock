import { Router } from "express";
import { z } from "zod";
import { requireAuth, requireRole } from "../../middleware/auth.middleware.js";
import { validate } from "../../middleware/validate.middleware.js";
import { registry } from "../../docs/registry.js";
import { errorResponseSchema } from "../../docs/schemas.js";
import { ROLES } from "../../lib/roles.js";
import * as shippingPolicyController from "./shipping-policy.controller.js";
import { shippingPolicyResponseSchema, updateShippingPolicySchema } from "./shipping-policy.schema.js";

export const shippingPolicyRouter = Router();

// Public: the guest /privacy page reads this on every load — none of it is
// sensitive, it's meant for public display. Same public-GET/admin-write
// pattern as terms.routes.ts/company-info.routes.ts.
shippingPolicyRouter.get("/", shippingPolicyController.getOne);

shippingPolicyRouter.use(requireAuth, requireRole(ROLES.ADMIN));

shippingPolicyRouter.patch("/", validate(updateShippingPolicySchema), shippingPolicyController.update);

const security = [{ cookieAuth: [] }];
const shippingPolicyWrapperResponse = z.object({ shippingPolicy: shippingPolicyResponseSchema });

registry.registerPath({
  method: "get",
  path: "/shipping-policy",
  tags: ["ShippingPolicy"],
  summary: "Get the delivery & returns policy content (public)",
  responses: {
    200: {
      description: "Delivery & returns policy",
      content: { "application/json": { schema: shippingPolicyWrapperResponse } },
    },
  },
});

registry.registerPath({
  method: "patch",
  path: "/shipping-policy",
  tags: ["ShippingPolicy"],
  summary: "Update the delivery & returns policy content (admin only)",
  security,
  request: { body: { content: { "application/json": { schema: updateShippingPolicySchema } } } },
  responses: {
    200: { description: "Updated", content: { "application/json": { schema: shippingPolicyWrapperResponse } } },
    401: { description: "Not authenticated", content: { "application/json": { schema: errorResponseSchema } } },
    403: { description: "Insufficient permissions", content: { "application/json": { schema: errorResponseSchema } } },
  },
});
