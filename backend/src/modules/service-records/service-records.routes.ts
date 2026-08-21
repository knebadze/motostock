import { Router } from "express";
import { z } from "zod";
import { requireAuth, requireRole } from "../../middleware/auth.middleware.js";
import { validate } from "../../middleware/validate.middleware.js";
import { registry } from "../../docs/registry.js";
import { errorResponseSchema } from "../../docs/schemas.js";
import { ROLES } from "../../lib/roles.js";
import * as serviceRecordsController from "./service-records.controller.js";
import {
  createServiceRecordSchema,
  listServiceRecordsQuerySchema,
  serviceRecordIdParamSchema,
  serviceRecordResponseSchema,
  updateServiceRecordSchema,
} from "./service-records.schema.js";

export const serviceRecordsRouter = Router();

// GET stays requireAuth-only (not admin-gated) — an admin can pull any
// vehicle's history, a regular user only their own (see
// service-records.service.ts's ownership check), so this same endpoint can
// back a future customer-facing "my vehicle's service history" view
// without a new route.
serviceRecordsRouter.get(
  "/",
  requireAuth,
  validate(listServiceRecordsQuerySchema, "query"),
  serviceRecordsController.list,
);

serviceRecordsRouter.post(
  "/",
  requireAuth,
  requireRole(ROLES.ADMIN),
  validate(createServiceRecordSchema),
  serviceRecordsController.create,
);
serviceRecordsRouter.patch(
  "/:id",
  requireAuth,
  requireRole(ROLES.ADMIN),
  validate(serviceRecordIdParamSchema, "params"),
  validate(updateServiceRecordSchema),
  serviceRecordsController.update,
);
serviceRecordsRouter.delete(
  "/:id",
  requireAuth,
  requireRole(ROLES.ADMIN),
  validate(serviceRecordIdParamSchema, "params"),
  serviceRecordsController.remove,
);

const security = [{ cookieAuth: [] }];
const listResponse = z.object({ items: z.array(serviceRecordResponseSchema) });
const itemResponse = z.object({ item: serviceRecordResponseSchema });

registry.registerPath({
  method: "get",
  path: "/service-records",
  tags: ["ServiceRecords"],
  summary: "List a garage vehicle's service history (admin: any vehicle; user: own only)",
  security,
  request: { query: listServiceRecordsQuerySchema },
  responses: {
    200: { description: "Service records", content: { "application/json": { schema: listResponse } } },
    403: { description: "Not the vehicle's owner", content: { "application/json": { schema: errorResponseSchema } } },
    404: { description: "Vehicle not found", content: { "application/json": { schema: errorResponseSchema } } },
  },
});

registry.registerPath({
  method: "post",
  path: "/service-records",
  tags: ["ServiceRecords"],
  summary: "Log a workshop service performed on a garage vehicle (admin)",
  security,
  request: { body: { content: { "application/json": { schema: createServiceRecordSchema } } } },
  responses: {
    201: { description: "Created", content: { "application/json": { schema: itemResponse } } },
    404: { description: "Vehicle or service type not found", content: { "application/json": { schema: errorResponseSchema } } },
  },
});

registry.registerPath({
  method: "patch",
  path: "/service-records/{id}",
  tags: ["ServiceRecords"],
  summary: "Update a service record (admin)",
  security,
  request: {
    params: serviceRecordIdParamSchema,
    body: { content: { "application/json": { schema: updateServiceRecordSchema } } },
  },
  responses: {
    200: { description: "Updated", content: { "application/json": { schema: itemResponse } } },
    404: { description: "Not found", content: { "application/json": { schema: errorResponseSchema } } },
  },
});

registry.registerPath({
  method: "delete",
  path: "/service-records/{id}",
  tags: ["ServiceRecords"],
  summary: "Delete a service record (admin)",
  security,
  request: { params: serviceRecordIdParamSchema },
  responses: {
    204: { description: "Deleted" },
    404: { description: "Not found", content: { "application/json": { schema: errorResponseSchema } } },
  },
});
