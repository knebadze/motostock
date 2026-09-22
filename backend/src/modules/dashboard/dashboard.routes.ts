import { Router } from "express";
import { requireAuth, requireRole } from "../../middleware/auth.middleware.js";
import { registry } from "../../docs/registry.js";
import { ROLES } from "../../lib/roles.js";
import * as dashboardController from "./dashboard.controller.js";
import { dashboardStatsResponseSchema } from "./dashboard.schema.js";

export const dashboardRouter = Router();

// Read-only single endpoint — safe to grant OPERATOR too (see proxy.ts's
// OPERATOR_ALLOWED_PATHS, which now includes the dashboard).
dashboardRouter.use(requireAuth, requireRole(ROLES.ADMIN, ROLES.OPERATOR));

dashboardRouter.get("/stats", dashboardController.stats);

registry.registerPath({
  method: "get",
  path: "/dashboard/stats",
  tags: ["Dashboard"],
  summary: "Aggregate at-a-glance admin dashboard stats (counts, recent orders, order-status breakdown, low-stock items)",
  security: [{ cookieAuth: [] }],
  responses: {
    200: { description: "Dashboard stats", content: { "application/json": { schema: dashboardStatsResponseSchema } } },
  },
});
