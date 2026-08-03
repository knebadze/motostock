import { Router } from "express";
import { z } from "zod";
import { requireAuth, requireRole } from "../../middleware/auth.middleware.js";
import { validate } from "../../middleware/validate.middleware.js";
import { registry } from "../../docs/registry.js";
import { errorResponseSchema } from "../../docs/schemas.js";
import { ROLES } from "../../lib/roles.js";
import * as lookupsController from "./lookups.controller.js";
import {
  createLookupItemSchema,
  lookupIdParamSchema,
  lookupItemResponseSchema,
  lookupTypeParamSchema,
  updateLookupItemSchema,
} from "./lookups.schema.js";

export const lookupsRouter = Router();

// Public: classifier value lists (fuel types, colors, cities, ...) aren't
// sensitive, and guest-facing forms need to read some of them directly (the
// address form's city dropdown) — same public-GET/admin-write pattern as
// categories, category-filters, vehicle-listings.
lookupsRouter.get("/:type", validate(lookupTypeParamSchema, "params"), lookupsController.list);

lookupsRouter.use(requireAuth, requireRole(ROLES.ADMIN));

lookupsRouter.post(
  "/:type",
  validate(lookupTypeParamSchema, "params"),
  validate(createLookupItemSchema),
  lookupsController.create,
);
lookupsRouter.patch(
  "/:type/:id",
  validate(lookupIdParamSchema, "params"),
  validate(updateLookupItemSchema),
  lookupsController.update,
);
lookupsRouter.delete(
  "/:type/:id",
  validate(lookupIdParamSchema, "params"),
  lookupsController.remove,
);

const security = [{ cookieAuth: [] }];
const lookupListResponse = z.object({ items: z.array(lookupItemResponseSchema) });
const lookupItemWrapper = z.object({ item: lookupItemResponseSchema });

registry.registerPath({
  method: "get",
  path: "/lookups/{type}",
  tags: ["Lookups"],
  summary: "List classifier lookup items by type (public)",
  request: { params: lookupTypeParamSchema },
  responses: {
    200: { description: "Items", content: { "application/json": { schema: lookupListResponse } } },
  },
});

registry.registerPath({
  method: "post",
  path: "/lookups/{type}",
  tags: ["Lookups"],
  summary: "Create a classifier lookup item",
  security,
  request: {
    params: lookupTypeParamSchema,
    body: { content: { "application/json": { schema: createLookupItemSchema } } },
  },
  responses: {
    201: { description: "Created", content: { "application/json": { schema: lookupItemWrapper } } },
    409: { description: "Key already in use", content: { "application/json": { schema: errorResponseSchema } } },
  },
});

registry.registerPath({
  method: "patch",
  path: "/lookups/{type}/{id}",
  tags: ["Lookups"],
  summary: "Update a classifier lookup item",
  security,
  request: {
    params: lookupIdParamSchema,
    body: { content: { "application/json": { schema: updateLookupItemSchema } } },
  },
  responses: {
    200: { description: "Updated", content: { "application/json": { schema: lookupItemWrapper } } },
    404: { description: "Not found", content: { "application/json": { schema: errorResponseSchema } } },
    409: { description: "Key already in use", content: { "application/json": { schema: errorResponseSchema } } },
  },
});

registry.registerPath({
  method: "delete",
  path: "/lookups/{type}/{id}",
  tags: ["Lookups"],
  summary: "Delete a classifier lookup item",
  security,
  request: { params: lookupIdParamSchema },
  responses: {
    204: { description: "Deleted" },
    400: { description: "In use, cannot delete", content: { "application/json": { schema: errorResponseSchema } } },
    404: { description: "Not found", content: { "application/json": { schema: errorResponseSchema } } },
  },
});
