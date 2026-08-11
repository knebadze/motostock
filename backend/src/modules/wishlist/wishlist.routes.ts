import { Router } from "express";
import { z } from "zod";
import { validate } from "../../middleware/validate.middleware.js";
import { registry } from "../../docs/registry.js";
import { errorResponseSchema } from "../../docs/schemas.js";
import * as wishlistController from "./wishlist.controller.js";
import { resolveWishlistOwner } from "./wishlist.middleware.js";
import {
  createWishlistItemSchema,
  wishlistCountResponseSchema,
  wishlistItemIdParamSchema,
  wishlistItemResponseSchema,
  wishlistStatusQuerySchema,
  wishlistStatusResponseSchema,
} from "./wishlist.schema.js";

export const wishlistRouter = Router();

// Logged-in users always pass; anonymous visitors only pass when guest
// wishlist access is enabled in Settings (see wishlist.middleware.ts) —
// otherwise this 401s exactly like requireAuth would. Path-scoped (not a
// bare .use()) for the same reason addresses/garage routers are — this
// router shares the /api/users mount prefix with others, and an unscoped
// .use() would run for their traffic too, not just this router's own.
wishlistRouter.use("/me/wishlist", resolveWishlistOwner);

wishlistRouter.get(
  "/me/wishlist/status",
  validate(wishlistStatusQuerySchema, "query"),
  wishlistController.status,
);
wishlistRouter.get("/me/wishlist", wishlistController.list);
wishlistRouter.get("/me/wishlist/count", wishlistController.count);
wishlistRouter.post(
  "/me/wishlist",
  validate(createWishlistItemSchema),
  wishlistController.create,
);
wishlistRouter.delete(
  "/me/wishlist/:id",
  validate(wishlistItemIdParamSchema, "params"),
  wishlistController.remove,
);

const security = [{ cookieAuth: [] }];
const listResponse = z.object({ items: z.array(wishlistItemResponseSchema) });
const itemResponse = z.object({ item: wishlistItemResponseSchema });

registry.registerPath({
  method: "get",
  path: "/users/me/wishlist",
  tags: ["Wishlist"],
  summary: "List the currently authenticated user's wishlist (products and vehicle listings)",
  security,
  responses: {
    200: { description: "Wishlist items", content: { "application/json": { schema: listResponse } } },
    401: { description: "Not authenticated", content: { "application/json": { schema: errorResponseSchema } } },
  },
});

registry.registerPath({
  method: "get",
  path: "/users/me/wishlist/count",
  tags: ["Wishlist"],
  summary: "Get the caller's wishlist item count — for a header badge",
  security,
  responses: {
    200: { description: "Wishlist count", content: { "application/json": { schema: wishlistCountResponseSchema } } },
    401: { description: "Not authenticated", content: { "application/json": { schema: errorResponseSchema } } },
  },
});

registry.registerPath({
  method: "get",
  path: "/users/me/wishlist/status",
  tags: ["Wishlist"],
  summary: "Check which of the given product/vehicle-listing ids are already wishlisted",
  security,
  request: { query: wishlistStatusQuerySchema },
  responses: {
    200: {
      description: "Wishlisted ids among the given ones",
      content: { "application/json": { schema: wishlistStatusResponseSchema } },
    },
    401: { description: "Not authenticated", content: { "application/json": { schema: errorResponseSchema } } },
  },
});

registry.registerPath({
  method: "post",
  path: "/users/me/wishlist",
  tags: ["Wishlist"],
  summary: "Add a product or vehicle listing to the caller's wishlist (idempotent)",
  security,
  request: { body: { content: { "application/json": { schema: createWishlistItemSchema } } } },
  responses: {
    201: { description: "Added", content: { "application/json": { schema: itemResponse } } },
    400: { description: "Invalid reference", content: { "application/json": { schema: errorResponseSchema } } },
    401: { description: "Not authenticated", content: { "application/json": { schema: errorResponseSchema } } },
  },
});

registry.registerPath({
  method: "delete",
  path: "/users/me/wishlist/{id}",
  tags: ["Wishlist"],
  summary: "Remove an item from the caller's wishlist",
  security,
  request: { params: wishlistItemIdParamSchema },
  responses: {
    204: { description: "Deleted" },
    401: { description: "Not authenticated", content: { "application/json": { schema: errorResponseSchema } } },
    404: { description: "Not found", content: { "application/json": { schema: errorResponseSchema } } },
  },
});
