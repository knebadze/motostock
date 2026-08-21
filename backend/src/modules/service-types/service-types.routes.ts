import { Router } from "express";
import { z } from "zod";
import { requireAuth, requireRole } from "../../middleware/auth.middleware.js";
import { validate } from "../../middleware/validate.middleware.js";
import { registry } from "../../docs/registry.js";
import { errorResponseSchema } from "../../docs/schemas.js";
import { ROLES } from "../../lib/roles.js";
import * as serviceTypesController from "./service-types.controller.js";
import {
  createServiceTypeSchema,
  reorderServiceTypesSchema,
  serviceTypeIdParamSchema,
  serviceTypeResponseSchema,
  updateServiceTypeSchema,
} from "./service-types.schema.js";

export const serviceTypesRouter = Router();

serviceTypesRouter.use(requireAuth, requireRole(ROLES.ADMIN));

serviceTypesRouter.get("/", serviceTypesController.list);
serviceTypesRouter.post("/", validate(createServiceTypeSchema), serviceTypesController.create);
serviceTypesRouter.patch(
  "/:id",
  validate(serviceTypeIdParamSchema, "params"),
  validate(updateServiceTypeSchema),
  serviceTypesController.update,
);
serviceTypesRouter.put(
  "/order",
  validate(reorderServiceTypesSchema),
  serviceTypesController.reorder,
);
serviceTypesRouter.delete(
  "/:id",
  validate(serviceTypeIdParamSchema, "params"),
  serviceTypesController.remove,
);

const security = [{ cookieAuth: [] }];
const listResponse = z.object({ items: z.array(serviceTypeResponseSchema) });
const itemResponse = z.object({ item: serviceTypeResponseSchema });

registry.registerPath({
  method: "get",
  path: "/service-types",
  tags: ["ServiceTypes"],
  summary: "List all workshop service types, including inactive ones (admin)",
  security,
  responses: {
    200: { description: "Service types", content: { "application/json": { schema: listResponse } } },
  },
});

registry.registerPath({
  method: "post",
  path: "/service-types",
  tags: ["ServiceTypes"],
  summary: "Create a workshop service type",
  security,
  request: { body: { content: { "application/json": { schema: createServiceTypeSchema } } } },
  responses: {
    201: { description: "Created", content: { "application/json": { schema: itemResponse } } },
  },
});

registry.registerPath({
  method: "patch",
  path: "/service-types/{id}",
  tags: ["ServiceTypes"],
  summary: "Update a workshop service type",
  security,
  request: {
    params: serviceTypeIdParamSchema,
    body: { content: { "application/json": { schema: updateServiceTypeSchema } } },
  },
  responses: {
    200: { description: "Updated", content: { "application/json": { schema: itemResponse } } },
    404: { description: "Not found", content: { "application/json": { schema: errorResponseSchema } } },
  },
});

registry.registerPath({
  method: "put",
  path: "/service-types/order",
  tags: ["ServiceTypes"],
  summary: "Reorder workshop service types",
  security,
  request: { body: { content: { "application/json": { schema: reorderServiceTypesSchema } } } },
  responses: {
    200: { description: "Reordered", content: { "application/json": { schema: listResponse } } },
    400: { description: "Id set mismatch", content: { "application/json": { schema: errorResponseSchema } } },
  },
});

registry.registerPath({
  method: "delete",
  path: "/service-types/{id}",
  tags: ["ServiceTypes"],
  summary: "Delete a workshop service type",
  security,
  request: { params: serviceTypeIdParamSchema },
  responses: {
    204: { description: "Deleted" },
    400: {
      description: "In use by existing service history",
      content: { "application/json": { schema: errorResponseSchema } },
    },
    404: { description: "Not found", content: { "application/json": { schema: errorResponseSchema } } },
  },
});
