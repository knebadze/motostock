import { Router } from "express";
import { z } from "zod";
import { requireAuth, requireRole } from "../../middleware/auth.middleware.js";
import { validate } from "../../middleware/validate.middleware.js";
import { registry } from "../../docs/registry.js";
import { errorResponseSchema } from "../../docs/schemas.js";
import { ROLES } from "../../lib/roles.js";
import * as settingsController from "./settings.controller.js";
import {
  guestFeatureStatusResponseSchema,
  settingsResponseSchema,
  updateSettingsSchema,
  vinDecodeStatusResponseSchema,
  monitoringStatusResponseSchema,
  publicMonitoringStatusResponseSchema,
} from "./settings.schema.js";

export const settingsRouter = Router();

// Public: not the Settings resource itself (that stays admin-only below) —
// just the two fields a guest-facing form needs to know whether to show
// the "fill via VIN" button. The admin fully controls this via the
// settings page; this route only exposes the resulting flag.
settingsRouter.get("/vin-decode-status", settingsController.getVinDecodeStatus);

// Public, same reasoning as vin-decode-status above — lets WishlistButton/
// AddToCartButton skip their per-item status check for a logged-out visitor
// when the corresponding guest feature is off, instead of always firing it
// and relying on the resulting 401.
settingsRouter.get("/guest-feature-status", settingsController.getGuestFeatureStatus);

// Public — the frontend gates its own browser/SSR Sentry reporting on the
// same admin toggle the backend uses (exposes only the on/off flag).
settingsRouter.get("/monitoring-public", settingsController.getPublicMonitoringStatus);

settingsRouter.use(requireAuth, requireRole(ROLES.ADMIN));

settingsRouter.get("/", settingsController.getOne);
settingsRouter.get("/monitoring-status", settingsController.getMonitoringStatus);
settingsRouter.post("/monitoring/test-sentry", settingsController.sendSentryTestEvent);
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
  path: "/settings/guest-feature-status",
  tags: ["Settings"],
  summary: "Get whether guest wishlist/cart access is enabled (public)",
  responses: {
    200: {
      description: "Guest feature status",
      content: { "application/json": { schema: guestFeatureStatusResponseSchema } },
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

registry.registerPath({
  method: "get",
  path: "/settings/monitoring-public",
  tags: ["Settings"],
  summary: "Whether Sentry reporting is switched on (public — the frontend's own Sentry SDK honors it)",
  responses: {
    200: { description: "Flag", content: { "application/json": { schema: publicMonitoringStatusResponseSchema } } },
  },
});

registry.registerPath({
  method: "get",
  path: "/settings/monitoring-status",
  tags: ["Settings"],
  summary: "Whether SENTRY_DSN is configured on this server (admin only)",
  security,
  responses: {
    200: { description: "Status", content: { "application/json": { schema: monitoringStatusResponseSchema } } },
    401: { description: "Not authenticated", content: { "application/json": { schema: errorResponseSchema } } },
    403: { description: "Not an admin", content: { "application/json": { schema: errorResponseSchema } } },
  },
});

registry.registerPath({
  method: "post",
  path: "/settings/monitoring/test-sentry",
  tags: ["Settings"],
  summary: "Send a test event to Sentry (admin only)",
  security,
  responses: {
    200: { description: "Sent", content: { "application/json": { schema: z.object({ sent: z.boolean() }) } } },
    400: { description: "SENTRY_DSN not configured", content: { "application/json": { schema: errorResponseSchema } } },
  },
});
