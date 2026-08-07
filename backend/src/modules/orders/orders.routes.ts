import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../../middleware/auth.middleware.js";
import { validate } from "../../middleware/validate.middleware.js";
import { registry } from "../../docs/registry.js";
import { errorResponseSchema } from "../../docs/schemas.js";
import * as ordersController from "./orders.controller.js";
import {
  checkoutInputSchema,
  checkoutPreviewResponseSchema,
  orderIdParamSchema,
  orderResponseSchema,
  orderSummaryResponseSchema,
} from "./orders.schema.js";

export const ordersRouter = Router();

// Mounted on its own /api/orders prefix (not shared with /api/users like
// addresses/garage/wishlist/cart) — every route here always requires a
// logged-in user (checkout has no guest mode, unlike cart/wishlist), so a
// blanket router-level requireAuth is safe: the router-mount-order 401 bug
// that hit garage/addresses only bites when routers sharing a prefix have
// different auth requirements, which doesn't apply here.
ordersRouter.use(requireAuth);

ordersRouter.post("/checkout/preview", validate(checkoutInputSchema), ordersController.preview);
ordersRouter.post("/checkout", validate(checkoutInputSchema), ordersController.checkout);
ordersRouter.get("/me", ordersController.list);
ordersRouter.get("/me/:id", validate(orderIdParamSchema, "params"), ordersController.getOne);

const security = [{ cookieAuth: [] }];
const listResponse = z.object({ orders: z.array(orderSummaryResponseSchema) });
const orderResponse = z.object({ order: orderResponseSchema });

registry.registerPath({
  method: "post",
  path: "/orders/checkout/preview",
  tags: ["Orders"],
  summary: "Compute checkout totals (items, discounts, promo code) for the caller's current cart without placing an order",
  security,
  request: { body: { content: { "application/json": { schema: checkoutInputSchema } } } },
  responses: {
    200: { description: "Checkout preview", content: { "application/json": { schema: checkoutPreviewResponseSchema } } },
    400: { description: "Empty cart or invalid promo code", content: { "application/json": { schema: errorResponseSchema } } },
    401: { description: "Not authenticated", content: { "application/json": { schema: errorResponseSchema } } },
  },
});

registry.registerPath({
  method: "post",
  path: "/orders/checkout",
  tags: ["Orders"],
  summary: "Place an order from the caller's current cart (snapshots prices/address/promo code, decrements stock, clears the cart)",
  security,
  request: { body: { content: { "application/json": { schema: checkoutInputSchema } } } },
  responses: {
    201: { description: "Order placed", content: { "application/json": { schema: orderResponse } } },
    400: { description: "Empty cart or invalid promo code", content: { "application/json": { schema: errorResponseSchema } } },
    401: { description: "Not authenticated", content: { "application/json": { schema: errorResponseSchema } } },
    404: { description: "Address not found", content: { "application/json": { schema: errorResponseSchema } } },
    409: { description: "Out of stock", content: { "application/json": { schema: errorResponseSchema } } },
  },
});

registry.registerPath({
  method: "get",
  path: "/orders/me",
  tags: ["Orders"],
  summary: "List the caller's placed orders",
  security,
  responses: {
    200: { description: "Orders", content: { "application/json": { schema: listResponse } } },
    401: { description: "Not authenticated", content: { "application/json": { schema: errorResponseSchema } } },
  },
});

registry.registerPath({
  method: "get",
  path: "/orders/me/{id}",
  tags: ["Orders"],
  summary: "Get one of the caller's placed orders in full detail",
  security,
  request: { params: orderIdParamSchema },
  responses: {
    200: { description: "Order", content: { "application/json": { schema: orderResponse } } },
    401: { description: "Not authenticated", content: { "application/json": { schema: errorResponseSchema } } },
    404: { description: "Not found", content: { "application/json": { schema: errorResponseSchema } } },
  },
});
