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
  popularVehicleListingsQuerySchema,
  updateVehicleListingSchema,
  vehicleListingDetailAdminResponseSchema,
  vehicleListingIdParamSchema,
  vehicleListingListQuerySchema,
  vehicleListingResponseSchema,
} from "./vehicle-listing.schema.js";

export const vehicleListingRouter = Router();

// Public: the guest shop page reads these. Everything else stays admin-only.
// /popular is registered before /:id so the literal "popular" segment isn't
// swallowed by the :id param route.
vehicleListingRouter.get(
  "/",
  validate(vehicleListingListQuerySchema, "query"),
  vehicleListingController.list,
);
vehicleListingRouter.get(
  "/popular",
  validate(popularVehicleListingsQuerySchema, "query"),
  vehicleListingController.getPopular,
);
vehicleListingRouter.get("/exchange-rate/usd-gel", vehicleListingController.getExchangeRate);
vehicleListingRouter.get(
  "/:id",
  validate(vehicleListingIdParamSchema, "params"),
  vehicleListingController.getOne,
);

// Per-route (not a blanket `.use()`) so /:id/detail can grant OPERATOR
// while POST/PATCH/DELETE stay ADMIN-only — a path-less `.use()` can't
// express that split. Also avoids the class of bug fixed for /api/products
// and /api/users: this router's mount prefix also catches requests meant
// for vehicleListingDiscountsRouter/vehicleListingImagesRouter (mounted
// separately at /api/vehicle-listings/:listingId/discounts|images but still
// routed through this router's stack first), which happened to be harmless
// here only because those routers already required ADMIN too — a future
// route added to either with a different role requirement would have
// silently inherited this router's blanket gate instead.
vehicleListingRouter.get(
  "/:id/detail",
  requireAuth,
  requireRole(ROLES.ADMIN, ROLES.OPERATOR),
  validate(vehicleListingIdParamSchema, "params"),
  vehicleListingController.getDetailAdmin,
);
vehicleListingRouter.post(
  "/",
  requireAuth,
  requireRole(ROLES.ADMIN),
  validate(createVehicleListingSchema),
  vehicleListingController.create,
);
vehicleListingRouter.patch(
  "/:id",
  requireAuth,
  requireRole(ROLES.ADMIN),
  validate(vehicleListingIdParamSchema, "params"),
  validate(updateVehicleListingSchema),
  vehicleListingController.update,
);
vehicleListingRouter.delete(
  "/:id",
  requireAuth,
  requireRole(ROLES.ADMIN),
  validate(vehicleListingIdParamSchema, "params"),
  vehicleListingController.remove,
);
const security = [{ cookieAuth: [] }];
// total/page/pageSize are only populated for the admin-list path (adminFilters
// present) — the storefront/popular paths never send page/pageSize and their
// responses omit these three fields, so they stay optional here.
const listResponse = z.object({
  items: z.array(vehicleListingResponseSchema),
  total: z.number().int().nonnegative().optional(),
  page: z.number().int().positive().optional(),
  pageSize: z.number().int().positive().optional(),
});
const itemResponse = z.object({ item: vehicleListingResponseSchema });

registry.registerPath({
  method: "get",
  path: "/vehicle-listings",
  tags: ["VehicleListings"],
  summary: "List all vehicle listings, optionally scoped to a category (public — guest shop page)",
  request: { query: vehicleListingListQuerySchema },
  responses: {
    200: { description: "Vehicle listings", content: { "application/json": { schema: listResponse } } },
  },
});

registry.registerPath({
  method: "get",
  path: "/vehicle-listings/popular",
  tags: ["VehicleListings"],
  summary: "List vehicle listings ranked by total sold quantity (public — homepage popular-vehicles slider)",
  request: { query: popularVehicleListingsQuerySchema },
  responses: {
    200: { description: "Popular vehicle listings", content: { "application/json": { schema: listResponse } } },
  },
});

registry.registerPath({
  method: "get",
  path: "/vehicle-listings/exchange-rate/usd-gel",
  tags: ["VehicleListings"],
  summary: "Get today's USD/GEL rate (public — storefront currency toggle, admin form hint)",
  responses: {
    200: {
      description: "Exchange rate",
      content: {
        "application/json": {
          schema: z.object({ rate: z.number().nullable(), updatedAt: z.iso.datetime().nullable() }),
        },
      },
    },
  },
});

registry.registerPath({
  method: "get",
  path: "/vehicle-listings/{id}",
  tags: ["VehicleListings"],
  summary: "Get a vehicle listing by id (public)",
  request: { params: vehicleListingIdParamSchema },
  responses: {
    200: { description: "Vehicle listing", content: { "application/json": { schema: itemResponse } } },
    404: { description: "Not found", content: { "application/json": { schema: errorResponseSchema } } },
  },
});

registry.registerPath({
  method: "get",
  path: "/vehicle-listings/{id}/detail",
  tags: ["VehicleListings"],
  summary: "Get a vehicle listing's full detail plus sales history by id — admin full-view",
  security,
  request: { params: vehicleListingIdParamSchema },
  responses: {
    200: {
      description: "Vehicle listing detail",
      content: { "application/json": { schema: z.object({ item: vehicleListingDetailAdminResponseSchema }) } },
    },
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
