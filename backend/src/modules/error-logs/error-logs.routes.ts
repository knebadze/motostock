import { Router } from "express";
import { z } from "zod";
import { requireAuth, requireRole } from "../../middleware/auth.middleware.js";
import { validate } from "../../middleware/validate.middleware.js";
import { registry } from "../../docs/registry.js";
import { ROLES } from "../../lib/roles.js";
import { errorLogsQuerySchema } from "./error-logs.schema.js";
import * as errorLogsController from "./error-logs.controller.js";

export const errorLogsRouter = Router();

errorLogsRouter.use(requireAuth, requireRole(ROLES.ADMIN));

errorLogsRouter.get("/", validate(errorLogsQuerySchema, "query"), errorLogsController.list);
errorLogsRouter.post("/clear", errorLogsController.clear);

const security = [{ cookieAuth: [] }];
const clearResponse = z.object({ message: z.string() });
const errorLogSchema = z.object({
  id: z.int(),
  message: z.string(),
  stack: z.string().nullable(),
  context: z.unknown().nullable(),
  createdAt: z.iso.datetime(),
});
const listResponse = z.object({
  logs: z.array(errorLogSchema),
  total: z.int(),
  page: z.int(),
  pageSize: z.int(),
});

registry.registerPath({
  method: "get",
  path: "/error-logs",
  tags: ["Error logs"],
  summary: "List server error logs, paginated (see lib/logger.ts's pino hook)",
  security,
  request: { query: errorLogsQuerySchema },
  responses: {
    200: { description: "Error logs", content: { "application/json": { schema: listResponse } } },
  },
});

registry.registerPath({
  method: "post",
  path: "/error-logs/clear",
  tags: ["Error logs"],
  summary: "Delete every stored error log",
  security,
  responses: {
    200: { description: "Logs cleared", content: { "application/json": { schema: clearResponse } } },
  },
});
