import { Router } from "express";
import { z } from "zod";
import { validate } from "../../middleware/validate.middleware.js";
import { registry } from "../../docs/registry.js";
import { errorResponseSchema } from "../../docs/schemas.js";
import * as cartController from "./cart.controller.js";
import { resolveCartOwner } from "./cart.middleware.js";
import {
  cartCountResponseSchema,
  cartItemIdParamSchema,
  cartItemResponseSchema,
  cartResponseSchema,
  cartStatusQuerySchema,
  cartStatusResponseSchema,
  createCartItemSchema,
  updateCartItemSchema,
} from "./cart.schema.js";

export const cartRouter = Router();

// Logged-in users always pass; anonymous visitors only pass when guest
// cart access is enabled in Settings (see cart.middleware.ts) — otherwise
// this 401s exactly like requireAuth would. Path-scoped (not a bare
// .use()) — this router shares the /api/users mount prefix with several
// others; an unscoped .use() would intercept their traffic too (this is
// exactly the bug that broke guest wishlist access before it was fixed).
cartRouter.use("/me/cart", resolveCartOwner);

cartRouter.get("/me/cart", cartController.list);
cartRouter.get("/me/cart/count", cartController.count);
cartRouter.get(
  "/me/cart/status",
  validate(cartStatusQuerySchema, "query"),
  cartController.status,
);
cartRouter.post("/me/cart", validate(createCartItemSchema), cartController.create);
cartRouter.patch(
  "/me/cart/:id",
  validate(cartItemIdParamSchema, "params"),
  validate(updateCartItemSchema),
  cartController.update,
);
cartRouter.delete(
  "/me/cart/:id",
  validate(cartItemIdParamSchema, "params"),
  cartController.remove,
);

const security = [{ cookieAuth: [] }];
const itemResponse = z.object({ item: cartItemResponseSchema });

registry.registerPath({
  method: "get",
  path: "/users/me/cart",
  tags: ["Cart"],
  summary: "Get the currently authenticated (or guest, if enabled) caller's cart",
  security,
  responses: {
    200: { description: "Cart", content: { "application/json": { schema: cartResponseSchema } } },
    401: { description: "Not authenticated", content: { "application/json": { schema: errorResponseSchema } } },
  },
});

registry.registerPath({
  method: "get",
  path: "/users/me/cart/count",
  tags: ["Cart"],
  summary: "Get the caller's cart item count (sum of quantities) — for a header badge",
  security,
  responses: {
    200: { description: "Cart count", content: { "application/json": { schema: cartCountResponseSchema } } },
    401: { description: "Not authenticated", content: { "application/json": { schema: errorResponseSchema } } },
  },
});

registry.registerPath({
  method: "get",
  path: "/users/me/cart/status",
  tags: ["Cart"],
  summary: "Check which of the given product-variant/vehicle-listing ids are already in the caller's cart",
  security,
  request: { query: cartStatusQuerySchema },
  responses: {
    200: {
      description: "Matching cart ids and quantities",
      content: { "application/json": { schema: cartStatusResponseSchema } },
    },
    401: { description: "Not authenticated", content: { "application/json": { schema: errorResponseSchema } } },
  },
});

registry.registerPath({
  method: "post",
  path: "/users/me/cart",
  tags: ["Cart"],
  summary: "Add a product variant or vehicle listing to the caller's cart (quantity adds if already present)",
  security,
  request: { body: { content: { "application/json": { schema: createCartItemSchema } } } },
  responses: {
    201: { description: "Added", content: { "application/json": { schema: itemResponse } } },
    400: { description: "Invalid reference or out of stock", content: { "application/json": { schema: errorResponseSchema } } },
    401: { description: "Not authenticated", content: { "application/json": { schema: errorResponseSchema } } },
  },
});

registry.registerPath({
  method: "patch",
  path: "/users/me/cart/{id}",
  tags: ["Cart"],
  summary: "Set a cart line's quantity (capped to available stock)",
  security,
  request: {
    params: cartItemIdParamSchema,
    body: { content: { "application/json": { schema: updateCartItemSchema } } },
  },
  responses: {
    200: { description: "Updated", content: { "application/json": { schema: itemResponse } } },
    400: { description: "Out of stock", content: { "application/json": { schema: errorResponseSchema } } },
    401: { description: "Not authenticated", content: { "application/json": { schema: errorResponseSchema } } },
    404: { description: "Not found", content: { "application/json": { schema: errorResponseSchema } } },
  },
});

registry.registerPath({
  method: "delete",
  path: "/users/me/cart/{id}",
  tags: ["Cart"],
  summary: "Remove a line from the caller's cart",
  security,
  request: { params: cartItemIdParamSchema },
  responses: {
    204: { description: "Deleted" },
    401: { description: "Not authenticated", content: { "application/json": { schema: errorResponseSchema } } },
    404: { description: "Not found", content: { "application/json": { schema: errorResponseSchema } } },
  },
});
