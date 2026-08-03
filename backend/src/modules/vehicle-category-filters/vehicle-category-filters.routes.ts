import { Router } from "express";
import { z } from "zod";
import { requireAuth, requireRole } from "../../middleware/auth.middleware.js";
import { validate } from "../../middleware/validate.middleware.js";
import { registry } from "../../docs/registry.js";
import { errorResponseSchema } from "../../docs/schemas.js";
import { ROLES } from "../../lib/roles.js";
import * as vehicleCategoryFiltersController from "./vehicle-category-filters.controller.js";
import {
  createVehicleCategoryFilterSchema,
  updateVehicleCategoryFilterSchema,
  vehicleCategoryFilterIdParamSchema,
  vehicleCategoryFilterListQuerySchema,
  vehicleCategoryFilterResponseSchema,
} from "./vehicle-category-filters.schema.js";

export const vehicleCategoryFiltersRouter = Router();

// Public: the guest shop page reads this to build its filter sidebar.
// Everything else (composing a category's filter panel) stays admin-only.
vehicleCategoryFiltersRouter.get(
  "/",
  validate(vehicleCategoryFilterListQuerySchema, "query"),
  vehicleCategoryFiltersController.list,
);

vehicleCategoryFiltersRouter.use(requireAuth, requireRole(ROLES.ADMIN));

vehicleCategoryFiltersRouter.post(
  "/",
  validate(createVehicleCategoryFilterSchema),
  vehicleCategoryFiltersController.create,
);
vehicleCategoryFiltersRouter.patch(
  "/:id",
  validate(vehicleCategoryFilterIdParamSchema, "params"),
  validate(updateVehicleCategoryFilterSchema),
  vehicleCategoryFiltersController.update,
);
vehicleCategoryFiltersRouter.delete(
  "/:id",
  validate(vehicleCategoryFilterIdParamSchema, "params"),
  vehicleCategoryFiltersController.remove,
);

const security = [{ cookieAuth: [] }];
const listResponse = z.object({ items: z.array(vehicleCategoryFilterResponseSchema) });
const itemResponse = z.object({ item: vehicleCategoryFilterResponseSchema });

registry.registerPath({
  method: "get",
  path: "/vehicle-category-filters",
  tags: ["VehicleCategoryFilters"],
  summary:
    "List a transport category's configured shop filters, in display order (public — guest shop filter sidebar)",
  request: { query: vehicleCategoryFilterListQuerySchema },
  responses: {
    200: { description: "Filters", content: { "application/json": { schema: listResponse } } },
  },
});

registry.registerPath({
  method: "post",
  path: "/vehicle-category-filters",
  tags: ["VehicleCategoryFilters"],
  summary: "Add a filter (price/year/brand/spec) to a transport category's shop filter panel",
  security,
  request: {
    body: { content: { "application/json": { schema: createVehicleCategoryFilterSchema } } },
  },
  responses: {
    201: { description: "Created", content: { "application/json": { schema: itemResponse } } },
    400: {
      description: "Invalid category/specField",
      content: { "application/json": { schema: errorResponseSchema } },
    },
    409: {
      description: "Already configured for this category",
      content: { "application/json": { schema: errorResponseSchema } },
    },
  },
});

registry.registerPath({
  method: "patch",
  path: "/vehicle-category-filters/{id}",
  tags: ["VehicleCategoryFilters"],
  summary: "Reorder a transport category filter",
  security,
  request: {
    params: vehicleCategoryFilterIdParamSchema,
    body: { content: { "application/json": { schema: updateVehicleCategoryFilterSchema } } },
  },
  responses: {
    200: { description: "Updated", content: { "application/json": { schema: itemResponse } } },
    404: { description: "Not found", content: { "application/json": { schema: errorResponseSchema } } },
  },
});

registry.registerPath({
  method: "delete",
  path: "/vehicle-category-filters/{id}",
  tags: ["VehicleCategoryFilters"],
  summary: "Remove a filter from a transport category's shop filter panel",
  security,
  request: { params: vehicleCategoryFilterIdParamSchema },
  responses: {
    204: { description: "Deleted" },
    404: { description: "Not found", content: { "application/json": { schema: errorResponseSchema } } },
  },
});
