import { Router } from "express";
import { z } from "zod";
import { requireAuth, requireRole } from "../../middleware/auth.middleware.js";
import { validate } from "../../middleware/validate.middleware.js";
import { registry } from "../../docs/registry.js";
import { errorResponseSchema } from "../../docs/schemas.js";
import { ROLES } from "../../lib/roles.js";
import * as finaSyncController from "./fina-sync.controller.js";
import { finaSyncRunResponseSchema, orderIdParamSchema, orderStockSyncResultSchema } from "./fina-sync.schema.js";

export const finaSyncRouter = Router();

finaSyncRouter.use(requireAuth, requireRole(ROLES.ADMIN));

finaSyncRouter.post("/run", finaSyncController.run);
finaSyncRouter.get("/runs", finaSyncController.list);
finaSyncRouter.post(
  "/orders/:orderId",
  validate(orderIdParamSchema, "params"),
  finaSyncController.syncOrder,
);

const security = [{ cookieAuth: [] }];
const runWrapperSchema = z.object({ run: finaSyncRunResponseSchema });
const runsWrapperSchema = z.object({ runs: z.array(finaSyncRunResponseSchema) });

registry.registerPath({
  method: "post",
  path: "/fina-sync/run",
  tags: ["FinaSync"],
  summary: "Manually trigger a FINA stock sync",
  security,
  responses: {
    200: { description: "Sync run result", content: { "application/json": { schema: runWrapperSchema } } },
    400: { description: "FINA not configured", content: { "application/json": { schema: errorResponseSchema } } },
    409: { description: "Sync already running", content: { "application/json": { schema: errorResponseSchema } } },
  },
});

registry.registerPath({
  method: "get",
  path: "/fina-sync/runs",
  tags: ["FinaSync"],
  summary: "List recent FINA sync runs",
  security,
  responses: {
    200: { description: "Sync run history", content: { "application/json": { schema: runsWrapperSchema } } },
  },
});

registry.registerPath({
  method: "post",
  path: "/fina-sync/orders/{orderId}",
  tags: ["FinaSync"],
  summary: "Re-check current FINA stock for just this order's FINA-linked products (admin order-detail action)",
  security,
  request: { params: orderIdParamSchema },
  responses: {
    200: { description: "Sync result", content: { "application/json": { schema: orderStockSyncResultSchema } } },
    400: { description: "FINA not configured", content: { "application/json": { schema: errorResponseSchema } } },
    401: { description: "Not authenticated", content: { "application/json": { schema: errorResponseSchema } } },
    403: { description: "Insufficient permissions", content: { "application/json": { schema: errorResponseSchema } } },
    502: { description: "FINA API call failed", content: { "application/json": { schema: errorResponseSchema } } },
  },
});
