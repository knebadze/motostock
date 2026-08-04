import { Router } from "express";
import { z } from "zod";
import { requireAuth, requireRole } from "../../middleware/auth.middleware.js";
import { validate } from "../../middleware/validate.middleware.js";
import { registry } from "../../docs/registry.js";
import { errorResponseSchema } from "../../docs/schemas.js";
import { ROLES } from "../../lib/roles.js";
import * as unitsController from "./units.controller.js";
import {
  createUnitSchema,
  unitIdParamSchema,
  unitResponseSchema,
  updateUnitSchema,
} from "./units.schema.js";

export const unitsRouter = Router();

unitsRouter.use(requireAuth, requireRole(ROLES.ADMIN));

unitsRouter.get("/", unitsController.list);
unitsRouter.get("/:id", validate(unitIdParamSchema, "params"), unitsController.getOne);
unitsRouter.post("/", validate(createUnitSchema), unitsController.create);
unitsRouter.patch(
  "/:id",
  validate(unitIdParamSchema, "params"),
  validate(updateUnitSchema),
  unitsController.update,
);
unitsRouter.delete("/:id", validate(unitIdParamSchema, "params"), unitsController.remove);

const security = [{ cookieAuth: [] }];
const listResponse = z.object({ items: z.array(unitResponseSchema) });
const itemResponse = z.object({ item: unitResponseSchema });

registry.registerPath({
  method: "get",
  path: "/units",
  tags: ["Units"],
  summary: "List units of measurement",
  security,
  responses: {
    200: { description: "Units list", content: { "application/json": { schema: listResponse } } },
  },
});

registry.registerPath({
  method: "get",
  path: "/units/{id}",
  tags: ["Units"],
  summary: "Get a unit by id",
  security,
  request: { params: unitIdParamSchema },
  responses: {
    200: { description: "Unit", content: { "application/json": { schema: itemResponse } } },
    404: { description: "Not found", content: { "application/json": { schema: errorResponseSchema } } },
  },
});

registry.registerPath({
  method: "post",
  path: "/units",
  tags: ["Units"],
  summary: "Create a unit",
  security,
  request: { body: { content: { "application/json": { schema: createUnitSchema } } } },
  responses: {
    201: { description: "Created", content: { "application/json": { schema: itemResponse } } },
  },
});

registry.registerPath({
  method: "patch",
  path: "/units/{id}",
  tags: ["Units"],
  summary: "Update a unit",
  security,
  request: {
    params: unitIdParamSchema,
    body: { content: { "application/json": { schema: updateUnitSchema } } },
  },
  responses: {
    200: { description: "Updated", content: { "application/json": { schema: itemResponse } } },
    404: { description: "Not found", content: { "application/json": { schema: errorResponseSchema } } },
  },
});

registry.registerPath({
  method: "delete",
  path: "/units/{id}",
  tags: ["Units"],
  summary: "Delete a unit",
  security,
  request: { params: unitIdParamSchema },
  responses: {
    204: { description: "Deleted" },
    400: { description: "Unit in use", content: { "application/json": { schema: errorResponseSchema } } },
    404: { description: "Not found", content: { "application/json": { schema: errorResponseSchema } } },
  },
});
