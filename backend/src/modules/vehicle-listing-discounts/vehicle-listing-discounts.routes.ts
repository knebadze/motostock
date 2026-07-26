import { Router } from "express";
import { z } from "zod";
import { requireAuth, requireRole } from "../../middleware/auth.middleware.js";
import { validate } from "../../middleware/validate.middleware.js";
import { registry } from "../../docs/registry.js";
import { errorResponseSchema } from "../../docs/schemas.js";
import { ROLES } from "../../lib/roles.js";
import * as vehicleListingDiscountsController from "./vehicle-listing-discounts.controller.js";
import {
  createVehicleListingDiscountSchema,
  updateVehicleListingDiscountSchema,
  vehicleListingDiscountIdParamSchema,
  vehicleListingDiscountListingIdParamSchema,
  vehicleListingDiscountResponseSchema,
} from "./vehicle-listing-discounts.schema.js";

export const vehicleListingDiscountsRouter = Router({ mergeParams: true });

vehicleListingDiscountsRouter.use(requireAuth, requireRole(ROLES.ADMIN));

vehicleListingDiscountsRouter.get(
  "/",
  validate(vehicleListingDiscountListingIdParamSchema, "params"),
  vehicleListingDiscountsController.list,
);
vehicleListingDiscountsRouter.post(
  "/",
  validate(vehicleListingDiscountListingIdParamSchema, "params"),
  validate(createVehicleListingDiscountSchema),
  vehicleListingDiscountsController.create,
);
vehicleListingDiscountsRouter.patch(
  "/:id",
  validate(vehicleListingDiscountIdParamSchema, "params"),
  validate(updateVehicleListingDiscountSchema),
  vehicleListingDiscountsController.update,
);
vehicleListingDiscountsRouter.delete(
  "/:id",
  validate(vehicleListingDiscountIdParamSchema, "params"),
  vehicleListingDiscountsController.remove,
);

const security = [{ cookieAuth: [] }];
const listResponse = z.object({ items: z.array(vehicleListingDiscountResponseSchema) });
const itemResponse = z.object({ item: vehicleListingDiscountResponseSchema });

registry.registerPath({
  method: "get",
  path: "/vehicle-listings/{listingId}/discounts",
  tags: ["VehicleListingDiscounts"],
  summary: "List discount periods for a vehicle listing",
  security,
  request: { params: vehicleListingDiscountListingIdParamSchema },
  responses: {
    200: { description: "Discounts", content: { "application/json": { schema: listResponse } } },
    404: { description: "Listing not found", content: { "application/json": { schema: errorResponseSchema } } },
  },
});

registry.registerPath({
  method: "post",
  path: "/vehicle-listings/{listingId}/discounts",
  tags: ["VehicleListingDiscounts"],
  summary: "Create a discount period for a vehicle listing",
  security,
  request: {
    params: vehicleListingDiscountListingIdParamSchema,
    body: { content: { "application/json": { schema: createVehicleListingDiscountSchema } } },
  },
  responses: {
    201: { description: "Created", content: { "application/json": { schema: itemResponse } } },
    400: { description: "Invalid dates", content: { "application/json": { schema: errorResponseSchema } } },
    404: { description: "Listing not found", content: { "application/json": { schema: errorResponseSchema } } },
  },
});

registry.registerPath({
  method: "patch",
  path: "/vehicle-listings/{listingId}/discounts/{id}",
  tags: ["VehicleListingDiscounts"],
  summary: "Update a discount period",
  security,
  request: {
    params: vehicleListingDiscountIdParamSchema,
    body: { content: { "application/json": { schema: updateVehicleListingDiscountSchema } } },
  },
  responses: {
    200: { description: "Updated", content: { "application/json": { schema: itemResponse } } },
    400: { description: "Invalid dates", content: { "application/json": { schema: errorResponseSchema } } },
    404: { description: "Not found", content: { "application/json": { schema: errorResponseSchema } } },
  },
});

registry.registerPath({
  method: "delete",
  path: "/vehicle-listings/{listingId}/discounts/{id}",
  tags: ["VehicleListingDiscounts"],
  summary: "Delete a discount period",
  security,
  request: { params: vehicleListingDiscountIdParamSchema },
  responses: {
    204: { description: "Deleted" },
    404: { description: "Not found", content: { "application/json": { schema: errorResponseSchema } } },
  },
});
