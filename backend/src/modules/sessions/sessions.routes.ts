import { Router } from "express";
import { requireAuth, requireRole } from "../../middleware/auth.middleware.js";
import { validate } from "../../middleware/validate.middleware.js";
import { registry } from "../../docs/registry.js";
import { errorResponseSchema } from "../../docs/schemas.js";
import { ROLES } from "../../lib/roles.js";
import * as sessionsController from "./sessions.controller.js";
import {
  listSessionsQuerySchema,
  sessionIdParamSchema,
  sessionsPageResponseSchema,
} from "./sessions.schema.js";

export const sessionsRouter = Router();

sessionsRouter.use(requireAuth, requireRole(ROLES.ADMIN));

sessionsRouter.get("/", validate(listSessionsQuerySchema, "query"), sessionsController.list);
sessionsRouter.delete(
  "/:id",
  validate(sessionIdParamSchema, "params"),
  sessionsController.revoke,
);

const security = [{ cookieAuth: [] }];

registry.registerPath({
  method: "get",
  path: "/sessions",
  tags: ["Sessions"],
  summary:
    "List active login sessions across every user, optionally filtered by name/email search (admin only)",
  security,
  responses: {
    200: { description: "Sessions", content: { "application/json": { schema: sessionsPageResponseSchema } } },
  },
});

registry.registerPath({
  method: "delete",
  path: "/sessions/{id}",
  tags: ["Sessions"],
  summary: "Revoke a session — forces that device to log in again on its next request (admin only)",
  security,
  request: { params: sessionIdParamSchema },
  responses: {
    204: { description: "Revoked" },
    404: { description: "Not found", content: { "application/json": { schema: errorResponseSchema } } },
  },
});
