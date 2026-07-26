import { Router } from "express";
import { z } from "zod";
import { requireAuth, requireRole } from "../../middleware/auth.middleware.js";
import { validate } from "../../middleware/validate.middleware.js";
import { registry } from "../../docs/registry.js";
import { errorResponseSchema } from "../../docs/schemas.js";
import { ROLES } from "../../lib/roles.js";
import * as vehicleListingController from "./vehicle-listing.controller.js";
import {
  createVehicleListingSchema,
  updateVehicleListingSchema,
  vehicleListingIdParamSchema,
  vehicleListingResponseSchema,
} from "./vehicle-listing.schema.js";

export const vehicleListingRouter = Router();

vehicleListingRouter.use(requireAuth, requireRole(ROLES.ADMIN));

vehicleListingRouter.get("/", vehicleListingController.list);
vehicleListingRouter.get(
  "/:id",
  validate(vehicleListingIdParamSchema, "params"),
  vehicleListingController.getOne,
);
vehicleListingRouter.post(
  "/",
  validate(createVehicleListingSchema),
  vehicleListingController.create,
);
vehicleListingRouter.patch(
  "/:id",
  validate(vehicleListingIdParamSchema, "params"),
  validate(updateVehicleListingSchema),
  vehicleListingController.update,
);
vehicleListingRouter.delete(
  "/:id",
  validate(vehicleListingIdParamSchema, "params"),
  vehicleListingController.remove,
);
const security = [{ cookieAuth: [] }];
const listResponse = z.object({ items: z.array(vehicleListingResponseSchema) });
const itemResponse = z.object({ item: vehicleListingResponseSchema });

registry.registerPath({
  method: "get",
  path: "/vehicle-listings",
  tags: ["VehicleListings"],
  summary: "List all vehicle listings",
  security,
  responses: {
    200: { description: "Vehicle listings", content: { "application/json": { schema: listResponse } } },
  },
});

registry.registerPath({
  method: "get",
  path: "/vehicle-listings/{id}",
  tags: ["VehicleListings"],
  summary: "Get a vehicle listing by id",
  security,
  request: { params: vehicleListingIdParamSchema },
  responses: {
    200: { description: "Vehicle listing", content: { "application/json": { schema: itemResponse } } },
    404: { description: "Not found", content: { "application/json": { schema: errorResponseSchema } } },
  },
});

registry.registerPath({
  method: "post",
  path: "/vehicle-listings",
  tags: ["VehicleListings"],
  summary: "Create a vehicle listing",
  security,
  request: { body: { content: { "application/json": { schema: createVehicleListingSchema } } } },
  responses: {
    201: { description: "Created", content: { "application/json": { schema: itemResponse } } },
    400: { description: "Invalid references", content: { "application/json": { schema: errorResponseSchema } } },
  },
});

registry.registerPath({
  method: "patch",
  path: "/vehicle-listings/{id}",
  tags: ["VehicleListings"],
  summary: "Update a vehicle listing",
  security,
  request: {
    params: vehicleListingIdParamSchema,
    body: { content: { "application/json": { schema: updateVehicleListingSchema } } },
  },
  responses: {
    200: { description: "Updated", content: { "application/json": { schema: itemResponse } } },
    400: { description: "Invalid references", content: { "application/json": { schema: errorResponseSchema } } },
    404: { description: "Not found", content: { "application/json": { schema: errorResponseSchema } } },
  },
});

registry.registerPath({
  method: "delete",
  path: "/vehicle-listings/{id}",
  tags: ["VehicleListings"],
  summary: "Delete a vehicle listing",
  security,
  request: { params: vehicleListingIdParamSchema },
  responses: {
    204: { description: "Deleted" },
    400: { description: "In use, cannot delete", content: { "application/json": { schema: errorResponseSchema } } },
    404: { description: "Not found", content: { "application/json": { schema: errorResponseSchema } } },
  },
});
