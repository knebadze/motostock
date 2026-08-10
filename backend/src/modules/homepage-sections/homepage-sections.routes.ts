import { Router } from "express";
import { z } from "zod";
import { requireAuth, requireRole } from "../../middleware/auth.middleware.js";
import { validate } from "../../middleware/validate.middleware.js";
import { registry } from "../../docs/registry.js";
import { errorResponseSchema } from "../../docs/schemas.js";
import { ROLES } from "../../lib/roles.js";
import * as homepageSectionsController from "./homepage-sections.controller.js";
import {
  homepageSectionIdParamSchema,
  homepageSectionResponseSchema,
  updateHomepageSectionSchema,
} from "./homepage-sections.schema.js";

export const homepageSectionsRouter = Router();

// Public — only active sections, for the homepage. Registered before the
// admin gate below, same narrow-public-endpoint pattern as
// /hero-slides/public: the full admin resource (including inactive rows)
// stays admin-only.
homepageSectionsRouter.get("/public", homepageSectionsController.listPublic);

homepageSectionsRouter.use(requireAuth, requireRole(ROLES.ADMIN));

homepageSectionsRouter.get("/", homepageSectionsController.list);
homepageSectionsRouter.patch(
  "/:id",
  validate(homepageSectionIdParamSchema, "params"),
  validate(updateHomepageSectionSchema),
  homepageSectionsController.update,
);

const security = [{ cookieAuth: [] }];
const listResponse = z.object({ items: z.array(homepageSectionResponseSchema) });
const itemResponse = z.object({ item: homepageSectionResponseSchema });

registry.registerPath({
  method: "get",
  path: "/homepage-sections/public",
  tags: ["HomepageSections"],
  summary: "List active homepage sections (public)",
  responses: {
    200: { description: "Active sections", content: { "application/json": { schema: listResponse } } },
  },
});

registry.registerPath({
  method: "get",
  path: "/homepage-sections",
  tags: ["HomepageSections"],
  summary: "List all homepage sections, including inactive ones (admin)",
  security,
  responses: {
    200: { description: "Sections", content: { "application/json": { schema: listResponse } } },
  },
});

registry.registerPath({
  method: "patch",
  path: "/homepage-sections/{id}",
  tags: ["HomepageSections"],
  summary: "Update a homepage section's title/active/order/item count",
  security,
  request: {
    params: homepageSectionIdParamSchema,
    body: { content: { "application/json": { schema: updateHomepageSectionSchema } } },
  },
  responses: {
    200: { description: "Updated", content: { "application/json": { schema: itemResponse } } },
    404: { description: "Not found", content: { "application/json": { schema: errorResponseSchema } } },
  },
});
