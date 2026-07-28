import { Router } from "express";
import { z } from "zod";
import { requireAuth, requireRole } from "../../middleware/auth.middleware.js";
import { registry } from "../../docs/registry.js";
import { errorResponseSchema } from "../../docs/schemas.js";
import { ROLES } from "../../lib/roles.js";
import * as finaSyncController from "./fina-sync.controller.js";
import { finaSyncRunResponseSchema } from "./fina-sync.schema.js";

export const finaSyncRouter = Router();

finaSyncRouter.use(requireAuth, requireRole(ROLES.ADMIN));

finaSyncRouter.post("/run", finaSyncController.run);
finaSyncRouter.get("/runs", finaSyncController.list);

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
