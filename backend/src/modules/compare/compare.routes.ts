import { Router } from "express";
import { z } from "zod";
import { validate } from "../../middleware/validate.middleware.js";
import { registry } from "../../docs/registry.js";
import { errorResponseSchema } from "../../docs/schemas.js";
import * as compareController from "./compare.controller.js";
import { resolveCompareOwner } from "./compare.middleware.js";
import {
  compareCountResponseSchema,
  compareItemIdParamSchema,
  compareItemResponseSchema,
  compareStatusQuerySchema,
  compareStatusResponseSchema,
  createCompareItemSchema,
} from "./compare.schema.js";

export const compareRouter = Router();

// Logged-in users and anonymous visitors both always pass (see
// compare.middleware.ts) — unlike wishlist, there's no Settings gate here.
// Path-scoped (not a bare .use()) for the same reason addresses/garage/
// wishlist routers are — this router shares the /api/users mount prefix
// with others.
compareRouter.use("/me/compare", resolveCompareOwner);

compareRouter.get(
  "/me/compare/status",
  validate(compareStatusQuerySchema, "query"),
  compareController.status,
);
compareRouter.get("/me/compare", compareController.list);
compareRouter.get("/me/compare/count", compareController.count);
compareRouter.post("/me/compare", validate(createCompareItemSchema), compareController.create);
compareRouter.delete(
  "/me/compare/:id",
  validate(compareItemIdParamSchema, "params"),
  compareController.remove,
);

const security = [{ cookieAuth: [] }];
const listResponse = z.object({ items: z.array(compareItemResponseSchema) });
const itemResponse = z.object({ item: compareItemResponseSchema });

registry.registerPath({
  method: "get",
  path: "/users/me/compare",
  tags: ["Compare"],
  summary: "List the caller's comparison list (products and vehicle listings)",
  security,
  responses: {
    200: { description: "Compare items", content: { "application/json": { schema: listResponse } } },
  },
});

registry.registerPath({
  method: "get",
  path: "/users/me/compare/count",
  tags: ["Compare"],
  summary: "Get the caller's comparison list item count — for a header badge",
  security,
  responses: {
    200: { description: "Compare count", content: { "application/json": { schema: compareCountResponseSchema } } },
  },
});

registry.registerPath({
  method: "get",
  path: "/users/me/compare/status",
  tags: ["Compare"],
  summary: "Check which of the given product/vehicle-listing ids are already in the comparison list",
  security,
  request: { query: compareStatusQuerySchema },
  responses: {
    200: {
      description: "Compared ids among the given ones",
      content: { "application/json": { schema: compareStatusResponseSchema } },
    },
  },
});

registry.registerPath({
  method: "post",
  path: "/users/me/compare",
  tags: ["Compare"],
  summary: "Add a product or vehicle listing to the caller's comparison list (idempotent, capped at 4 items)",
  security,
  request: { body: { content: { "application/json": { schema: createCompareItemSchema } } } },
  responses: {
    201: { description: "Added", content: { "application/json": { schema: itemResponse } } },
    400: { description: "Invalid reference or limit reached", content: { "application/json": { schema: errorResponseSchema } } },
  },
});

registry.registerPath({
  method: "delete",
  path: "/users/me/compare/{id}",
  tags: ["Compare"],
  summary: "Remove an item from the caller's comparison list",
  security,
  request: { params: compareItemIdParamSchema },
  responses: {
    204: { description: "Deleted" },
    404: { description: "Not found", content: { "application/json": { schema: errorResponseSchema } } },
  },
});
