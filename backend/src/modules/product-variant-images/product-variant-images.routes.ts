import { Router } from "express";
import { z } from "zod";
import { requireAuth, requireRole } from "../../middleware/auth.middleware.js";
import { validate } from "../../middleware/validate.middleware.js";
import { uploadRateLimit } from "../../middleware/rateLimit.middleware.js";
import { imageUpload } from "../../middleware/upload.middleware.js";
import { registry } from "../../docs/registry.js";
import { errorResponseSchema } from "../../docs/schemas.js";
import { ROLES } from "../../lib/roles.js";
import * as productVariantImagesController from "./product-variant-images.controller.js";
import {
  productVariantImageIdParamSchema,
  productVariantImageResponseSchema,
  productVariantImageVariantIdParamSchema,
  reorderProductVariantImagesSchema,
} from "./product-variant-images.schema.js";

export const productVariantImagesRouter = Router({ mergeParams: true });

productVariantImagesRouter.use(requireAuth, requireRole(ROLES.ADMIN));

productVariantImagesRouter.get(
  "/",
  validate(productVariantImageVariantIdParamSchema, "params"),
  productVariantImagesController.list,
);
productVariantImagesRouter.post(
  "/",
  uploadRateLimit,
  validate(productVariantImageVariantIdParamSchema, "params"),
  imageUpload().array("images", 10),
  productVariantImagesController.upload,
);
productVariantImagesRouter.put(
  "/order",
  validate(productVariantImageVariantIdParamSchema, "params"),
  validate(reorderProductVariantImagesSchema),
  productVariantImagesController.reorder,
);
productVariantImagesRouter.delete(
  "/:imageId",
  validate(productVariantImageIdParamSchema, "params"),
  productVariantImagesController.remove,
);

const security = [{ cookieAuth: [] }];
const listResponse = z.object({ items: z.array(productVariantImageResponseSchema) });

registry.registerPath({
  method: "get",
  path: "/product-variants/{variantId}/images",
  tags: ["ProductVariantImages"],
  summary: "List images for a product variant, ordered (first = main photo)",
  security,
  request: { params: productVariantImageVariantIdParamSchema },
  responses: {
    200: { description: "Images", content: { "application/json": { schema: listResponse } } },
    404: { description: "Variant not found", content: { "application/json": { schema: errorResponseSchema } } },
  },
});

registry.registerPath({
  method: "post",
  path: "/product-variants/{variantId}/images",
  tags: ["ProductVariantImages"],
  summary: "Upload one or more images, appended after existing images",
  security,
  request: {
    params: productVariantImageVariantIdParamSchema,
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
    404: { description: "Variant not found", content: { "application/json": { schema: errorResponseSchema } } },
  },
});

registry.registerPath({
  method: "put",
  path: "/product-variants/{variantId}/images/order",
  tags: ["ProductVariantImages"],
  summary: "Reorder images; the first id becomes the main photo",
  security,
  request: {
    params: productVariantImageVariantIdParamSchema,
    body: { content: { "application/json": { schema: reorderProductVariantImagesSchema } } },
  },
  responses: {
    200: { description: "Reordered", content: { "application/json": { schema: listResponse } } },
    400: { description: "Image list mismatch", content: { "application/json": { schema: errorResponseSchema } } },
    404: { description: "Variant not found", content: { "application/json": { schema: errorResponseSchema } } },
  },
});

registry.registerPath({
  method: "delete",
  path: "/product-variants/{variantId}/images/{imageId}",
  tags: ["ProductVariantImages"],
  summary: "Delete an image",
  security,
  request: { params: productVariantImageIdParamSchema },
  responses: {
    204: { description: "Deleted" },
    404: { description: "Not found", content: { "application/json": { schema: errorResponseSchema } } },
  },
});
