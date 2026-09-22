import { Router } from "express";
import { z } from "zod";
import { requireAuth, requireRole } from "../../middleware/auth.middleware.js";
import { validate } from "../../middleware/validate.middleware.js";
import { changePasswordRateLimit } from "../../middleware/rateLimit.middleware.js";
import { registry } from "../../docs/registry.js";
import { errorResponseSchema, userResponseSchema } from "../../docs/schemas.js";
import { addressResponseSchema } from "../addresses/addresses.schema.js";
import { garageVehicleResponseSchema } from "../garage/garage.schema.js";
import { wishlistItemResponseSchema } from "../wishlist/wishlist.schema.js";
import { cartItemResponseSchema } from "../cart/cart.schema.js";
import { ROLES } from "../../lib/roles.js";
import { changePassword, createWalkIn, getOne, list, me, merge, updateRole } from "./users.controller.js";
import {
  changePasswordSchema,
  createWalkInUserSchema,
  listUsersQuerySchema,
  mergeUserParamsSchema,
  updateUserRoleSchema,
  userIdParamSchema,
} from "./users.schema.js";

export const usersRouter = Router();

usersRouter.get("/me", requireAuth, me);
usersRouter.patch(
  "/me/password",
  requireAuth,
  // Takes currentPassword — without a limit, a valid-but-stolen session
  // cookie could be used to brute-force the account's real password via
  // this endpoint's bcrypt compare, same class of risk the login/register/
  // reset-password limiters guard against. Its own independent limiter
  // (not the shared one those use) — this is a distinct attack surface
  // from anonymous login, so it shouldn't share a budget with it either.
  changePasswordRateLimit,
  validate(changePasswordSchema),
  changePassword,
);
usersRouter.get(
  "/",
  requireAuth,
  // Also OPERATOR — the workshop "სერვისის ისტორია" screen searches this
  // list to pick a customer before it can show/attach their garage/service
  // records (see garage.routes.ts's admin-scoped /:userId/garage, granted
  // the same way).
  requireRole(ROLES.ADMIN, ROLES.OPERATOR),
  validate(listUsersQuerySchema, "query"),
  list,
);
usersRouter.get(
  "/:id",
  requireAuth,
  requireRole(ROLES.ADMIN, ROLES.OPERATOR),
  validate(userIdParamSchema, "params"),
  getOne,
);
usersRouter.post(
  "/walk-in",
  requireAuth,
  // Also OPERATOR — registering a walk-in customer is part of the workshop
  // "სერვისის ისტორია" screen's normal flow (see ServiceHistoryManager.tsx),
  // not a catalog/data-management write the OPERATOR role is otherwise kept
  // away from.
  requireRole(ROLES.ADMIN, ROLES.OPERATOR),
  validate(createWalkInUserSchema),
  createWalkIn,
);
usersRouter.post(
  "/:id/merge-into/:targetUserId",
  requireAuth,
  requireRole(ROLES.ADMIN),
  validate(mergeUserParamsSchema, "params"),
  merge,
);
usersRouter.patch(
  "/:id/role",
  requireAuth,
  requireRole(ROLES.ADMIN),
  validate(userIdParamSchema, "params"),
  validate(updateUserRoleSchema),
  updateRole,
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
    phone: z.string().nullable(),
    dateOfBirth: z.iso.datetime().nullable(),
    // A workshop-entered customer with no login of their own — see
    // users.service.ts's createWalkInUser.
    isWalkIn: z.boolean(),
    // Set once an admin manually links this (walk-in) row onto a real
    // account — the row is kept, not deleted, and stays visible in the
    // admin list, per the "მაინც უნდა ჩანდეს" requirement.
    mergedIntoUserId: z.int().nullable(),
    role: z.enum(["USER", "ADMIN", "OPERATOR"]),
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
  summary: "List all registered users, optionally searched by name/email (admin only)",
  security: [{ cookieAuth: [] }],
  request: { query: listUsersQuerySchema },
  responses: {
    200: {
      description: "Users",
      content: {
        "application/json": {
          schema: z.object({
            users: z.array(adminUserResponseSchema),
            total: z.int().openapi({ example: 42 }),
            page: z.int().openapi({ example: 1 }),
            pageSize: z.int().openapi({ example: 20 }),
          }),
        },
      },
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
    addresses: z.array(addressResponseSchema),
    garage: z.array(garageVehicleResponseSchema),
    wishlist: z.array(wishlistItemResponseSchema),
    cart: z.array(cartItemResponseSchema),
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

registry.registerPath({
  method: "post",
  path: "/users/walk-in",
  tags: ["Users"],
  summary: "Create a walk-in customer with no site login (admin or operator, workshop screen)",
  security: [{ cookieAuth: [] }],
  request: { body: { content: { "application/json": { schema: createWalkInUserSchema } } } },
  responses: {
    201: {
      description: "Created",
      content: { "application/json": { schema: z.object({ user: adminUserResponseSchema }) } },
    },
    401: {
      description: "Not authenticated",
      content: { "application/json": { schema: errorResponseSchema } },
    },
    403: {
      description: "Insufficient permissions",
      content: { "application/json": { schema: errorResponseSchema } },
    },
    409: {
      description: "Phone number already in use",
      content: { "application/json": { schema: errorResponseSchema } },
    },
  },
});

registry.registerPath({
  method: "post",
  path: "/users/{id}/merge-into/{targetUserId}",
  tags: ["Users"],
  summary: "Manually merge one user (typically a walk-in) into another (admin only)",
  security: [{ cookieAuth: [] }],
  request: { params: mergeUserParamsSchema },
  responses: {
    200: {
      description: "Merged",
      content: { "application/json": { schema: z.object({ user: adminUserResponseSchema }) } },
    },
    400: {
      description: "Invalid merge (same user, or either side already merged)",
      content: { "application/json": { schema: errorResponseSchema } },
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

registry.registerPath({
  method: "patch",
  path: "/users/{id}/role",
  tags: ["Users"],
  summary: "Change a user's role — the only way to grant/revoke OPERATOR (admin only)",
  security: [{ cookieAuth: [] }],
  request: {
    params: userIdParamSchema,
    body: { content: { "application/json": { schema: updateUserRoleSchema } } },
  },
  responses: {
    200: {
      description: "Updated",
      content: { "application/json": { schema: z.object({ user: adminUserResponseSchema }) } },
    },
    400: {
      description: "Cannot change your own role",
      content: { "application/json": { schema: errorResponseSchema } },
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
