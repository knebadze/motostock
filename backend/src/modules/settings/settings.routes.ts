import { Router } from "express";
import { z } from "zod";
import { requireAuth, requireRole } from "../../middleware/auth.middleware.js";
import { validate } from "../../middleware/validate.middleware.js";
import { registry } from "../../docs/registry.js";
import { errorResponseSchema } from "../../docs/schemas.js";
import { ROLES } from "../../lib/roles.js";
import * as settingsController from "./settings.controller.js";
import {
  settingsResponseSchema,
  updateSettingsSchema,
  vinDecodeStatusResponseSchema,
} from "./settings.schema.js";

export const settingsRouter = Router();

// Public: not the Settings resource itself (that stays admin-only below) —
// just the two fields a guest-facing form needs to know whether to show
// the "fill via VIN" button. The admin fully controls this via the
// settings page; this route only exposes the resulting flag.
settingsRouter.get("/vin-decode-status", settingsController.getVinDecodeStatus);

settingsRouter.use(requireAuth, requireRole(ROLES.ADMIN));

settingsRouter.get("/", settingsController.getOne);
settingsRouter.patch("/", validate(updateSettingsSchema), settingsController.update);

const security = [{ cookieAuth: [] }];
const settingsWrapperSchema = z.object({ settings: settingsResponseSchema });

registry.registerPath({
  method: "get",
  path: "/settings/vin-decode-status",
  tags: ["Settings"],
  summary: "Get whether VIN decode is enabled and which provider is configured (public)",
  responses: {
    200: {
      description: "VIN decode status",
      content: { "application/json": { schema: vinDecodeStatusResponseSchema } },
    },
  },
});

registry.registerPath({
  method: "get",
  path: "/settings",
  tags: ["Settings"],
  summary: "Get website settings (admin only)",
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
