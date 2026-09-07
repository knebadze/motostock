import { Router } from "express";
import { requireAuth, requireRole } from "../../middleware/auth.middleware.js";
import { registry } from "../../docs/registry.js";
import { ROLES } from "../../lib/roles.js";
import * as visitorsController from "./visitors.controller.js";
import { visitorOverviewResponseSchema } from "./visitors.schema.js";

export const visitorsRouter = Router();

// Public, no auth — every visitor (logged-in user or guest) pings this
// periodically (see the frontend's VisitorPingBeacon) to keep their
// presence row fresh. Same "passive, unconditional, no Settings gate"
// reasoning as product-views.middleware.ts's resolveProductViewOwner.
visitorsRouter.post("/ping", visitorsController.ping);

visitorsRouter.get("/overview", requireAuth, requireRole(ROLES.ADMIN), visitorsController.overview);

const security = [{ cookieAuth: [] }];

registry.registerPath({
  method: "post",
  path: "/visitors/ping",
  tags: ["Visitors"],
  summary:
    "Record a heartbeat for the current visitor, logged-in user or guest (public — called periodically by the frontend)",
  responses: {
    204: { description: "Recorded" },
  },
});

registry.registerPath({
  method: "get",
  path: "/visitors/overview",
  tags: ["Visitors"],
  summary: "Active-now count plus today's/this-week's unique-visitor stats (admin only)",
  security,
  responses: {
    200: {
      description: "Overview",
      content: { "application/json": { schema: visitorOverviewResponseSchema } },
    },
  },
});
