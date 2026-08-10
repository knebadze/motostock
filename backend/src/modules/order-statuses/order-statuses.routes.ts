import { Router } from "express";
import { z } from "zod";
import { requireAuth, requireRole } from "../../middleware/auth.middleware.js";
import { validate } from "../../middleware/validate.middleware.js";
import { registry } from "../../docs/registry.js";
import { errorResponseSchema } from "../../docs/schemas.js";
import { ROLES } from "../../lib/roles.js";
import * as orderStatusesController from "./order-statuses.controller.js";
import {
  createOrderStatusSchema,
  orderStatusIdParamSchema,
  orderStatusResponseSchema,
  updateOrderStatusItemSchema,
} from "./order-statuses.schema.js";

export const orderStatusesRouter = Router();

// Public read (same reasoning as lookups.routes.ts, which this replaces for
// order statuses specifically — the value list itself isn't sensitive).
orderStatusesRouter.get("/", orderStatusesController.list);

orderStatusesRouter.use(requireAuth, requireRole(ROLES.ADMIN));

orderStatusesRouter.post("/", validate(createOrderStatusSchema), orderStatusesController.create);
orderStatusesRouter.patch(
  "/:id",
  validate(orderStatusIdParamSchema, "params"),
  validate(updateOrderStatusItemSchema),
  orderStatusesController.update,
);
orderStatusesRouter.delete(
  "/:id",
  validate(orderStatusIdParamSchema, "params"),
  orderStatusesController.remove,
);

const security = [{ cookieAuth: [] }];
const listResponse = z.object({ items: z.array(orderStatusResponseSchema) });
const itemResponse = z.object({ item: orderStatusResponseSchema });

registry.registerPath({
  method: "get",
  path: "/order-statuses",
  tags: ["OrderStatuses"],
  summary: "List order statuses, ordered by sortOrder (public)",
  responses: {
    200: { description: "Statuses", content: { "application/json": { schema: listResponse } } },
  },
});

registry.registerPath({
  method: "post",
  path: "/order-statuses",
  tags: ["OrderStatuses"],
  summary: "Create an order status",
  security,
  request: { body: { content: { "application/json": { schema: createOrderStatusSchema } } } },
  responses: {
    201: { description: "Created", content: { "application/json": { schema: itemResponse } } },
    409: { description: "Key already in use", content: { "application/json": { schema: errorResponseSchema } } },
  },
});

registry.registerPath({
  method: "patch",
  path: "/order-statuses/{id}",
  tags: ["OrderStatuses"],
  summary: "Update an order status (including its sortOrder)",
  security,
  request: {
    params: orderStatusIdParamSchema,
    body: { content: { "application/json": { schema: updateOrderStatusItemSchema } } },
  },
  responses: {
    200: { description: "Updated", content: { "application/json": { schema: itemResponse } } },
    404: { description: "Not found", content: { "application/json": { schema: errorResponseSchema } } },
    409: { description: "Key already in use", content: { "application/json": { schema: errorResponseSchema } } },
  },
});

registry.registerPath({
  method: "delete",
  path: "/order-statuses/{id}",
  tags: ["OrderStatuses"],
  summary: "Delete an order status",
  security,
  request: { params: orderStatusIdParamSchema },
  responses: {
    204: { description: "Deleted" },
    400: { description: "In use, cannot delete", content: { "application/json": { schema: errorResponseSchema } } },
    404: { description: "Not found", content: { "application/json": { schema: errorResponseSchema } } },
  },
});
