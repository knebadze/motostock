import { Router } from "express";
import { z } from "zod";
import { requireAuth, requireRole } from "../../middleware/auth.middleware.js";
import { validate } from "../../middleware/validate.middleware.js";
import { registry } from "../../docs/registry.js";
import { errorResponseSchema } from "../../docs/schemas.js";
import { ROLES } from "../../lib/roles.js";
import * as vacanciesController from "./vacancies.controller.js";
import {
  createVacancySchema,
  updateVacancySchema,
  vacancyIdParamSchema,
  vacancyResponseSchema,
  vacancySlugParamSchema,
} from "./vacancies.schema.js";

export const vacanciesRouter = Router();

// Public — active vacancies only, newest first. Registered before the admin
// gate below, same narrow-public-endpoint pattern as /faq/public.
vacanciesRouter.get("/public", vacanciesController.listPublic);
vacanciesRouter.get(
  "/by-slug/:slug",
  validate(vacancySlugParamSchema, "params"),
  vacanciesController.getBySlug,
);

vacanciesRouter.use(requireAuth, requireRole(ROLES.ADMIN));

vacanciesRouter.get("/", vacanciesController.list);
vacanciesRouter.post("/", validate(createVacancySchema), vacanciesController.create);
vacanciesRouter.patch(
  "/:id",
  validate(vacancyIdParamSchema, "params"),
  validate(updateVacancySchema),
  vacanciesController.update,
);
vacanciesRouter.delete(
  "/:id",
  validate(vacancyIdParamSchema, "params"),
  vacanciesController.remove,
);

const security = [{ cookieAuth: [] }];
const listResponse = z.object({ items: z.array(vacancyResponseSchema) });
const itemResponse = z.object({ item: vacancyResponseSchema });

registry.registerPath({
  method: "get",
  path: "/vacancies/public",
  tags: ["Vacancies"],
  summary: "List active vacancies, newest first (public — guest vacancies page)",
  responses: {
    200: { description: "Active vacancies", content: { "application/json": { schema: listResponse } } },
  },
});

registry.registerPath({
  method: "get",
  path: "/vacancies/by-slug/{slug}",
  tags: ["Vacancies"],
  summary: "Get a single active vacancy by slug (public — guest vacancy detail page)",
  request: { params: vacancySlugParamSchema },
  responses: {
    200: { description: "Vacancy", content: { "application/json": { schema: itemResponse } } },
    404: { description: "Not found", content: { "application/json": { schema: errorResponseSchema } } },
  },
});

registry.registerPath({
  method: "get",
  path: "/vacancies",
  tags: ["Vacancies"],
  summary: "List all vacancies, including inactive ones (admin)",
  security,
  responses: {
    200: { description: "Vacancies", content: { "application/json": { schema: listResponse } } },
  },
});

registry.registerPath({
  method: "post",
  path: "/vacancies",
  tags: ["Vacancies"],
  summary: "Create a vacancy",
  security,
  request: { body: { content: { "application/json": { schema: createVacancySchema } } } },
  responses: {
    201: { description: "Created", content: { "application/json": { schema: itemResponse } } },
    409: { description: "Slug already in use", content: { "application/json": { schema: errorResponseSchema } } },
  },
});

registry.registerPath({
  method: "patch",
  path: "/vacancies/{id}",
  tags: ["Vacancies"],
  summary: "Update a vacancy",
  security,
  request: {
    params: vacancyIdParamSchema,
    body: { content: { "application/json": { schema: updateVacancySchema } } },
  },
  responses: {
    200: { description: "Updated", content: { "application/json": { schema: itemResponse } } },
    404: { description: "Not found", content: { "application/json": { schema: errorResponseSchema } } },
    409: { description: "Slug already in use", content: { "application/json": { schema: errorResponseSchema } } },
  },
});

registry.registerPath({
  method: "delete",
  path: "/vacancies/{id}",
  tags: ["Vacancies"],
  summary: "Delete a vacancy",
  security,
  request: { params: vacancyIdParamSchema },
  responses: {
    204: { description: "Deleted" },
    404: { description: "Not found", content: { "application/json": { schema: errorResponseSchema } } },
  },
});
