import { Router } from "express";
import { requireAuth, requireRole } from "../../middleware/auth.middleware.js";
import { validate } from "../../middleware/validate.middleware.js";
import { registry } from "../../docs/registry.js";
import { ROLES } from "../../lib/roles.js";
import * as analyticsController from "./analytics.controller.js";
import { analyticsOverviewResponseSchema, analyticsQuerySchema } from "./analytics.schema.js";

export const analyticsRouter = Router();

analyticsRouter.use(requireAuth, requireRole(ROLES.ADMIN));

analyticsRouter.get(
  "/overview",
  validate(analyticsQuerySchema, "query"),
  analyticsController.getOverview,
);

registry.registerPath({
  method: "get",
  path: "/analytics/overview",
  tags: ["Analytics"],
  summary: "Full admin analytics: product demand (views/wishlist/cart/sales), revenue over time, order-status breakdown, and cancellations — one date-scoped consolidated response",
  security: [{ cookieAuth: [] }],
  request: { query: analyticsQuerySchema },
  responses: {
    200: { description: "Analytics overview", content: { "application/json": { schema: analyticsOverviewResponseSchema } } },
  },
});
