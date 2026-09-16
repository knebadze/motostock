import { Router } from "express";
import { z } from "zod";
import { requireAuth, requireRole } from "../../middleware/auth.middleware.js";
import { validate } from "../../middleware/validate.middleware.js";
import { uploadRateLimit } from "../../middleware/rateLimit.middleware.js";
import { imageUpload } from "../../middleware/upload.middleware.js";
import { registry } from "../../docs/registry.js";
import { errorResponseSchema } from "../../docs/schemas.js";
import { ROLES } from "../../lib/roles.js";
import { heroSlideResponseSchema } from "../hero-slides/hero-slides.schema.js";
import * as bulkDiscountEventsController from "./bulk-discount-events.controller.js";
import {
  bulkDiscountEventHeroSlideInputSchema,
  bulkDiscountEventIdParamSchema,
  bulkDiscountEventInputSchema,
  bulkDiscountEventResponseSchema,
  bulkDiscountEventsPageResponseSchema,
  listBulkDiscountEventsQuerySchema,
  repeatBulkDiscountEventSchema,
} from "./bulk-discount-events.schema.js";

export const bulkDiscountEventsRouter = Router();

bulkDiscountEventsRouter.use(requireAuth, requireRole(ROLES.ADMIN));

bulkDiscountEventsRouter.get(
  "/",
  validate(listBulkDiscountEventsQuerySchema, "query"),
  bulkDiscountEventsController.list,
);
bulkDiscountEventsRouter.post(
  "/:id/repeat",
  validate(bulkDiscountEventIdParamSchema, "params"),
  validate(repeatBulkDiscountEventSchema),
  bulkDiscountEventsController.repeat,
);
bulkDiscountEventsRouter.patch(
  "/:id",
  validate(bulkDiscountEventIdParamSchema, "params"),
  validate(bulkDiscountEventInputSchema),
  bulkDiscountEventsController.update,
);
bulkDiscountEventsRouter.post(
  "/:id/image",
  uploadRateLimit,
  validate(bulkDiscountEventIdParamSchema, "params"),
  imageUpload().single("image"),
  bulkDiscountEventsController.uploadImage,
);
bulkDiscountEventsRouter.get(
  "/:id/hero-slide",
  validate(bulkDiscountEventIdParamSchema, "params"),
  bulkDiscountEventsController.getHeroSlide,
);
bulkDiscountEventsRouter.put(
  "/:id/hero-slide",
  validate(bulkDiscountEventIdParamSchema, "params"),
  validate(bulkDiscountEventHeroSlideInputSchema),
  bulkDiscountEventsController.setHeroSlide,
);
bulkDiscountEventsRouter.post(
  "/:id/hero-slide/image",
  uploadRateLimit,
  validate(bulkDiscountEventIdParamSchema, "params"),
  imageUpload().single("image"),
  bulkDiscountEventsController.uploadHeroSlideImage,
);
bulkDiscountEventsRouter.delete(
  "/:id",
  validate(bulkDiscountEventIdParamSchema, "params"),
  bulkDiscountEventsController.remove,
);

const security = [{ cookieAuth: [] }];

registry.registerPath({
  method: "get",
  path: "/bulk-discount-events",
  tags: ["BulkDiscountEvents"],
  summary: "List bulk-discount events (optionally filtered by target type), paginated",
  security,
  request: { query: listBulkDiscountEventsQuerySchema },
  responses: {
    200: {
      description: "Events",
      content: { "application/json": { schema: bulkDiscountEventsPageResponseSchema } },
    },
  },
});

registry.registerPath({
  method: "post",
  path: "/bulk-discount-events/{id}/repeat",
  tags: ["BulkDiscountEvents"],
  summary: "Re-apply a past event's batch (same items, same percent) at new dates, as a new event",
  security,
  request: {
    params: bulkDiscountEventIdParamSchema,
    body: { content: { "application/json": { schema: repeatBulkDiscountEventSchema } } },
  },
  responses: {
    201: {
      description: "New event created",
      content: { "application/json": { schema: z.object({ item: bulkDiscountEventResponseSchema }) } },
    },
    400: { description: "Source event's items no longer exist", content: { "application/json": { schema: errorResponseSchema } } },
    404: { description: "Event not found", content: { "application/json": { schema: errorResponseSchema } } },
  },
});

registry.registerPath({
  method: "patch",
  path: "/bulk-discount-events/{id}",
  tags: ["BulkDiscountEvents"],
  summary: "Edit an event's name/description (metadata only — not the discounts it groups)",
  security,
  request: {
    params: bulkDiscountEventIdParamSchema,
    body: { content: { "application/json": { schema: bulkDiscountEventInputSchema } } },
  },
  responses: {
    200: {
      description: "Updated",
      content: { "application/json": { schema: z.object({ item: bulkDiscountEventResponseSchema }) } },
    },
    404: { description: "Event not found", content: { "application/json": { schema: errorResponseSchema } } },
  },
});

registry.registerPath({
  method: "post",
  path: "/bulk-discount-events/{id}/image",
  tags: ["BulkDiscountEvents"],
  summary: "Upload/replace an event's image",
  security,
  request: { params: bulkDiscountEventIdParamSchema },
  responses: {
    200: {
      description: "Updated",
      content: { "application/json": { schema: z.object({ item: bulkDiscountEventResponseSchema }) } },
    },
    400: { description: "No file uploaded", content: { "application/json": { schema: errorResponseSchema } } },
    404: { description: "Event not found", content: { "application/json": { schema: errorResponseSchema } } },
  },
});

registry.registerPath({
  method: "get",
  path: "/bulk-discount-events/{id}/hero-slide",
  tags: ["BulkDiscountEvents"],
  summary: "Get this event's homepage hero-slider slide, if one has been created",
  security,
  request: { params: bulkDiscountEventIdParamSchema },
  responses: {
    200: {
      description: "Slide",
      content: { "application/json": { schema: z.object({ item: heroSlideResponseSchema }) } },
    },
    404: { description: "Event or slide not found", content: { "application/json": { schema: errorResponseSchema } } },
  },
});

registry.registerPath({
  method: "put",
  path: "/bulk-discount-events/{id}/hero-slide",
  tags: ["BulkDiscountEvents"],
  summary: "Create or update this event's homepage hero-slider slide (title/subtitle/buttonLabel only)",
  security,
  request: {
    params: bulkDiscountEventIdParamSchema,
    body: { content: { "application/json": { schema: bulkDiscountEventHeroSlideInputSchema } } },
  },
  responses: {
    200: {
      description: "Created or updated",
      content: { "application/json": { schema: z.object({ item: heroSlideResponseSchema }) } },
    },
    404: { description: "Event not found", content: { "application/json": { schema: errorResponseSchema } } },
  },
});

registry.registerPath({
  method: "post",
  path: "/bulk-discount-events/{id}/hero-slide/image",
  tags: ["BulkDiscountEvents"],
  summary: "Upload/replace this event's hero-slider slide image",
  security,
  request: { params: bulkDiscountEventIdParamSchema },
  responses: {
    200: {
      description: "Updated",
      content: { "application/json": { schema: z.object({ item: heroSlideResponseSchema }) } },
    },
    400: { description: "No file uploaded", content: { "application/json": { schema: errorResponseSchema } } },
    404: { description: "No slide created for this event yet", content: { "application/json": { schema: errorResponseSchema } } },
  },
});

registry.registerPath({
  method: "delete",
  path: "/bulk-discount-events/{id}",
  tags: ["BulkDiscountEvents"],
  summary: "Delete an event (the discounts it grouped are unaffected — FK is SetNull)",
  security,
  request: { params: bulkDiscountEventIdParamSchema },
  responses: {
    204: { description: "Deleted" },
    404: { description: "Not found", content: { "application/json": { schema: errorResponseSchema } } },
  },
});
