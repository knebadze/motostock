import { Router } from "express";
import { z } from "zod";
import { requireAuth, requireRole } from "../../middleware/auth.middleware.js";
import { validate } from "../../middleware/validate.middleware.js";
import { registry } from "../../docs/registry.js";
import { errorResponseSchema, userResponseSchema } from "../../docs/schemas.js";
import { addressResponseSchema } from "../addresses/addresses.schema.js";
import { garageVehicleResponseSchema } from "../garage/garage.schema.js";
import { ROLES } from "../../lib/roles.js";
import { changePassword, getOne, list, me } from "./users.controller.js";
import { changePasswordSchema, userIdParamSchema } from "./users.schema.js";

export const usersRouter = Router();

usersRouter.get("/me", requireAuth, me);
usersRouter.patch(
  "/me/password",
  requireAuth,
  validate(changePasswordSchema),
  changePassword,
);
usersRouter.get("/", requireAuth, requireRole(ROLES.ADMIN), list);
usersRouter.get(
  "/:id",
  requireAuth,
  requireRole(ROLES.ADMIN),
  validate(userIdParamSchema, "params"),
  getOne,
);

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

const adminUserDetailResponseSchema = registry.register(
  "AdminUserDetail",
  adminUserResponseSchema.extend({
    address: addressResponseSchema.nullable(),
    garage: z.array(garageVehicleResponseSchema),
  }),
);

registry.registerPath({
  method: "get",
  path: "/users/{id}",
  tags: ["Users"],
  summary: "Get a single user's full details, including address and garage (admin only)",
  security: [{ cookieAuth: [] }],
  request: { params: userIdParamSchema },
  responses: {
    200: {
      description: "User detail",
      content: { "application/json": { schema: z.object({ user: adminUserDetailResponseSchema }) } },
    },
    401: {
      description: "Not authenticated",
      content: { "application/json": { schema: errorResponseSchema } },
    },
    403: {
      description: "Insufficient permissions",
      content: { "application/json": { schema: errorResponseSchema } },
    },
    404: {
      description: "Not found",
      content: { "application/json": { schema: errorResponseSchema } },
    },
  },
});
