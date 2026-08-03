import { Router } from "express";
import { z } from "zod";
import { requireAuth, requireRole } from "../../middleware/auth.middleware.js";
import { validate } from "../../middleware/validate.middleware.js";
import { registry } from "../../docs/registry.js";
import { errorResponseSchema, userResponseSchema } from "../../docs/schemas.js";
import { ROLES } from "../../lib/roles.js";
import { changePassword, list, me } from "./users.controller.js";
import { changePasswordSchema } from "./users.schema.js";

export const usersRouter = Router();

usersRouter.get("/me", requireAuth, me);
usersRouter.patch(
  "/me/password",
  requireAuth,
  validate(changePasswordSchema),
  changePassword,
);
usersRouter.get("/", requireAuth, requireRole(ROLES.ADMIN), list);

registry.registerPath({
  method: "get",
  path: "/users/me",
  tags: ["Users"],
  summary: "Get the currently authenticated user",
  security: [{ cookieAuth: [] }],
  responses: {
    200: {
      description: "Current user",
      content: { "application/json": { schema: z.object({ user: userResponseSchema }) } },
    },
    401: {
      description: "Not authenticated",
      content: { "application/json": { schema: errorResponseSchema } },
    },
  },
});

registry.registerPath({
  method: "patch",
  path: "/users/me/password",
  tags: ["Users"],
  summary: "Change the currently authenticated user's password",
  security: [{ cookieAuth: [] }],
  request: { body: { content: { "application/json": { schema: changePasswordSchema } } } },
  responses: {
    204: { description: "Password changed" },
    400: {
      description: "Missing or incorrect current password",
      content: { "application/json": { schema: errorResponseSchema } },
    },
    401: {
      description: "Not authenticated",
      content: { "application/json": { schema: errorResponseSchema } },
    },
  },
});

const adminUserResponseSchema = registry.register(
  "AdminUser",
  z.object({
    id: z.int().openapi({ example: 1 }),
    email: z.email().openapi({ example: "rider@motostock.ge" }),
    name: z.string().openapi({ example: "Nika Beridze" }),
    role: z.enum(["USER", "ADMIN"]),
    hasPassword: z.boolean(),
    hasGoogle: z.boolean(),
    hasFacebook: z.boolean(),
    createdAt: z.iso.datetime(),
  }),
);

registry.registerPath({
  method: "get",
  path: "/users",
  tags: ["Users"],
  summary: "List all registered users (admin only)",
  security: [{ cookieAuth: [] }],
  responses: {
    200: {
      description: "Users",
      content: { "application/json": { schema: z.object({ users: z.array(adminUserResponseSchema) }) } },
    },
    401: {
      description: "Not authenticated",
      content: { "application/json": { schema: errorResponseSchema } },
    },
    403: {
      description: "Insufficient permissions",
      content: { "application/json": { schema: errorResponseSchema } },
    },
  },
});
