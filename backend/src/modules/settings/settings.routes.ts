import { Router } from "express";
import { z } from "zod";
import { requireAuth, requireRole } from "../../middleware/auth.middleware.js";
import { validate } from "../../middleware/validate.middleware.js";
import { registry } from "../../docs/registry.js";
import { errorResponseSchema } from "../../docs/schemas.js";
import { ROLES } from "../../lib/roles.js";
import * as settingsController from "./settings.controller.js";
import { settingsResponseSchema, updateSettingsSchema } from "./settings.schema.js";

export const settingsRouter = Router();

settingsRouter.use(requireAuth, requireRole(ROLES.ADMIN));

settingsRouter.get("/", settingsController.getOne);
settingsRouter.patch("/", validate(updateSettingsSchema), settingsController.update);

const security = [{ cookieAuth: [] }];
const settingsWrapperSchema = z.object({ settings: settingsResponseSchema });

registry.registerPath({
  method: "get",
  path: "/settings",
  tags: ["Settings"],
  summary: "Get website settings",
  security,
  responses: {
    200: { description: "Settings", content: { "application/json": { schema: settingsWrapperSchema } } },
    401: { description: "Not authenticated", content: { "application/json": { schema: errorResponseSchema } } },
    403: { description: "Insufficient permissions", content: { "application/json": { schema: errorResponseSchema } } },
  },
});

registry.registerPath({
  method: "patch",
  path: "/settings",
  tags: ["Settings"],
  summary: "Update website settings",
  security,
  request: {
    body: { content: { "application/json": { schema: updateSettingsSchema } } },
  },
  responses: {
    200: { description: "Updated", content: { "application/json": { schema: settingsWrapperSchema } } },
    400: { description: "Invalid input or misconfigured provider", content: { "application/json": { schema: errorResponseSchema } } },
  },
});
