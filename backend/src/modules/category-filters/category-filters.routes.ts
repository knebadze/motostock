import { Router } from "express";
import { z } from "zod";
import { requireAuth, requireRole } from "../../middleware/auth.middleware.js";
import { validate } from "../../middleware/validate.middleware.js";
import { registry } from "../../docs/registry.js";
import { errorResponseSchema } from "../../docs/schemas.js";
import { ROLES } from "../../lib/roles.js";
import * as categoryFiltersController from "./category-filters.controller.js";
import {
  categoryFilterIdParamSchema,
  categoryFilterListQuerySchema,
  categoryFilterResponseSchema,
  createCategoryFilterSchema,
  updateCategoryFilterSchema,
} from "./category-filters.schema.js";

export const categoryFiltersRouter = Router();

// Public: the guest shop page reads this to build its filter sidebar.
// Everything else (composing a category's filter panel) stays admin-only.
categoryFiltersRouter.get(
  "/",
  validate(categoryFilterListQuerySchema, "query"),
  categoryFiltersController.list,
);

categoryFiltersRouter.use(requireAuth, requireRole(ROLES.ADMIN));

categoryFiltersRouter.post(
  "/",
  validate(createCategoryFilterSchema),
  categoryFiltersController.create,
);
categoryFiltersRouter.patch(
  "/:id",
  validate(categoryFilterIdParamSchema, "params"),
  validate(updateCategoryFilterSchema),
  categoryFiltersController.update,
);
categoryFiltersRouter.delete(
  "/:id",
  validate(categoryFilterIdParamSchema, "params"),
  categoryFiltersController.remove,
);

const security = [{ cookieAuth: [] }];
const listResponse = z.object({ items: z.array(categoryFilterResponseSchema) });
const itemResponse = z.object({ item: categoryFilterResponseSchema });

registry.registerPath({
  method: "get",
  path: "/category-filters",
  tags: ["CategoryFilters"],
  summary: "List a category's configured shop filters, in display order (public — guest shop filter sidebar)",
  request: { query: categoryFilterListQuerySchema },
  responses: {
    200: { description: "Filters", content: { "application/json": { schema: listResponse } } },
  },
});

registry.registerPath({
  method: "post",
  path: "/category-filters",
  tags: ["CategoryFilters"],
  summary: "Add a filter (price/brand/attribute) to a category's shop filter panel",
  security,
  request: { body: { content: { "application/json": { schema: createCategoryFilterSchema } } } },
  responses: {
    201: { description: "Created", content: { "application/json": { schema: itemResponse } } },
    400: {
      description: "Invalid category/attribute",
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
  path: "/category-filters/{id}",
  tags: ["CategoryFilters"],
  summary: "Reorder a category filter",
  security,
  request: {
    params: categoryFilterIdParamSchema,
    body: { content: { "application/json": { schema: updateCategoryFilterSchema } } },
  },
  responses: {
    200: { description: "Updated", content: { "application/json": { schema: itemResponse } } },
    404: { description: "Not found", content: { "application/json": { schema: errorResponseSchema } } },
  },
});

registry.registerPath({
  method: "delete",
  path: "/category-filters/{id}",
  tags: ["CategoryFilters"],
  summary: "Remove a filter from a category's shop filter panel",
  security,
  request: { params: categoryFilterIdParamSchema },
  responses: {
    204: { description: "Deleted" },
    404: { description: "Not found", content: { "application/json": { schema: errorResponseSchema } } },
  },
});
