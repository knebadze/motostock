import { Router } from "express";
import { z } from "zod";
import { requireAuth, requireRole } from "../../middleware/auth.middleware.js";
import { validate } from "../../middleware/validate.middleware.js";
import { uploadRateLimit } from "../../middleware/rateLimit.middleware.js";
import { imageUpload } from "../../middleware/upload.middleware.js";
import { registry } from "../../docs/registry.js";
import { errorResponseSchema } from "../../docs/schemas.js";
import { ROLES } from "../../lib/roles.js";
import * as vehicleListingImagesController from "./vehicle-listing-images.controller.js";
import {
  reorderVehicleListingImagesSchema,
  vehicleListingImageIdParamSchema,
  vehicleListingImageListingIdParamSchema,
  vehicleListingImageResponseSchema,
} from "./vehicle-listing-images.schema.js";

export const vehicleListingImagesRouter = Router({ mergeParams: true });

vehicleListingImagesRouter.use(requireAuth, requireRole(ROLES.ADMIN));

vehicleListingImagesRouter.get(
  "/",
  validate(vehicleListingImageListingIdParamSchema, "params"),
  vehicleListingImagesController.list,
);
vehicleListingImagesRouter.post(
  "/",
  uploadRateLimit,
  validate(vehicleListingImageListingIdParamSchema, "params"),
  imageUpload().array("images", 10),
  vehicleListingImagesController.upload,
);
vehicleListingImagesRouter.put(
  "/order",
  validate(vehicleListingImageListingIdParamSchema, "params"),
  validate(reorderVehicleListingImagesSchema),
  vehicleListingImagesController.reorder,
);
vehicleListingImagesRouter.delete(
  "/:imageId",
  validate(vehicleListingImageIdParamSchema, "params"),
  vehicleListingImagesController.remove,
);

const security = [{ cookieAuth: [] }];
const listResponse = z.object({ items: z.array(vehicleListingImageResponseSchema) });

registry.registerPath({
  method: "get",
  path: "/vehicle-listings/{listingId}/images",
  tags: ["VehicleListingImages"],
  summary: "List images for a vehicle listing, ordered (first = main photo)",
  security,
  request: { params: vehicleListingImageListingIdParamSchema },
  responses: {
    200: { description: "Images", content: { "application/json": { schema: listResponse } } },
    404: { description: "Listing not found", content: { "application/json": { schema: errorResponseSchema } } },
  },
});

registry.registerPath({
  method: "post",
  path: "/vehicle-listings/{listingId}/images",
  tags: ["VehicleListingImages"],
  summary: "Upload one or more images, appended after existing images",
  security,
  request: {
    params: vehicleListingImageListingIdParamSchema,
    body: {
      content: {
        "multipart/form-data": {
          schema: z.object({ images: z.array(z.string().openapi({ format: "binary" })) }),
        },
      },
    },
  },
  responses: {
    201: { description: "Uploaded", content: { "application/json": { schema: listResponse } } },
    400: { description: "Invalid file", content: { "application/json": { schema: errorResponseSchema } } },
    404: { description: "Listing not found", content: { "application/json": { schema: errorResponseSchema } } },
  },
});

registry.registerPath({
  method: "put",
  path: "/vehicle-listings/{listingId}/images/order",
  tags: ["VehicleListingImages"],
  summary: "Reorder images; the first id becomes the main photo",
  security,
  request: {
    params: vehicleListingImageListingIdParamSchema,
    body: { content: { "application/json": { schema: reorderVehicleListingImagesSchema } } },
  },
  responses: {
    200: { description: "Reordered", content: { "application/json": { schema: listResponse } } },
    400: { description: "Image list mismatch", content: { "application/json": { schema: errorResponseSchema } } },
    404: { description: "Listing not found", content: { "application/json": { schema: errorResponseSchema } } },
  },
});

registry.registerPath({
  method: "delete",
  path: "/vehicle-listings/{listingId}/images/{imageId}",
  tags: ["VehicleListingImages"],
  summary: "Delete an image",
  security,
  request: { params: vehicleListingImageIdParamSchema },
  responses: {
    204: { description: "Deleted" },
    404: { description: "Not found", content: { "application/json": { schema: errorResponseSchema } } },
  },
});
