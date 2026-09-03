import { Router } from "express";
import { z } from "zod";
import { requireAuth, requireRole } from "../../middleware/auth.middleware.js";
import { validate } from "../../middleware/validate.middleware.js";
import { uploadRateLimit } from "../../middleware/rateLimit.middleware.js";
import { imageUpload } from "../../middleware/upload.middleware.js";
import { registry } from "../../docs/registry.js";
import { errorResponseSchema } from "../../docs/schemas.js";
import { ROLES } from "../../lib/roles.js";
import * as heroSlidesController from "./hero-slides.controller.js";
import {
  createHeroSlideSchema,
  heroSlideIdParamSchema,
  heroSlideResponseSchema,
  reorderHeroSlidesSchema,
  updateHeroSlideSchema,
} from "./hero-slides.schema.js";

export const heroSlidesRouter = Router();

// Public — only active slides, for the homepage. Registered before the
// admin gate below, same narrow-public-endpoint pattern as
// /settings/vin-decode-status: the full admin resource (including inactive
// slides) stays admin-only.
heroSlidesRouter.get("/public", heroSlidesController.listPublic);

heroSlidesRouter.use(requireAuth, requireRole(ROLES.ADMIN));

heroSlidesRouter.get("/", heroSlidesController.list);
heroSlidesRouter.post("/", validate(createHeroSlideSchema), heroSlidesController.create);
heroSlidesRouter.patch(
  "/:id",
  validate(heroSlideIdParamSchema, "params"),
  validate(updateHeroSlideSchema),
  heroSlidesController.update,
);
heroSlidesRouter.post(
  "/:id/image",
  uploadRateLimit,
  validate(heroSlideIdParamSchema, "params"),
  imageUpload().single("image"),
  heroSlidesController.uploadImage,
);
heroSlidesRouter.put(
  "/order",
  validate(reorderHeroSlidesSchema),
  heroSlidesController.reorder,
);
heroSlidesRouter.delete(
  "/:id",
  validate(heroSlideIdParamSchema, "params"),
  heroSlidesController.remove,
);

const security = [{ cookieAuth: [] }];
const listResponse = z.object({ items: z.array(heroSlideResponseSchema) });
const itemResponse = z.object({ item: heroSlideResponseSchema });

registry.registerPath({
  method: "get",
  path: "/hero-slides/public",
  tags: ["HeroSlides"],
  summary: "List active homepage hero slides (public)",
  responses: {
    200: { description: "Active hero slides", content: { "application/json": { schema: listResponse } } },
  },
});

registry.registerPath({
  method: "get",
  path: "/hero-slides",
  tags: ["HeroSlides"],
  summary: "List all hero slides, including inactive ones (admin)",
  security,
  responses: {
    200: { description: "Hero slides", content: { "application/json": { schema: listResponse } } },
  },
});

registry.registerPath({
  method: "post",
  path: "/hero-slides",
  tags: ["HeroSlides"],
  summary: "Create a hero slide",
  security,
  request: { body: { content: { "application/json": { schema: createHeroSlideSchema } } } },
  responses: {
    201: { description: "Created", content: { "application/json": { schema: itemResponse } } },
    400: { description: "Invalid input", content: { "application/json": { schema: errorResponseSchema } } },
  },
});

registry.registerPath({
  method: "patch",
  path: "/hero-slides/{id}",
  tags: ["HeroSlides"],
  summary: "Update a hero slide",
  security,
  request: {
    params: heroSlideIdParamSchema,
    body: { content: { "application/json": { schema: updateHeroSlideSchema } } },
  },
  responses: {
    200: { description: "Updated", content: { "application/json": { schema: itemResponse } } },
    404: { description: "Not found", content: { "application/json": { schema: errorResponseSchema } } },
  },
});

registry.registerPath({
  method: "post",
  path: "/hero-slides/{id}/image",
  tags: ["HeroSlides"],
  summary: "Upload a hero slide's background image",
  security,
  request: { params: heroSlideIdParamSchema },
  responses: {
    200: { description: "Updated", content: { "application/json": { schema: itemResponse } } },
    404: { description: "Not found", content: { "application/json": { schema: errorResponseSchema } } },
  },
});

registry.registerPath({
  method: "put",
  path: "/hero-slides/order",
  tags: ["HeroSlides"],
  summary: "Reorder hero slides",
  security,
  request: { body: { content: { "application/json": { schema: reorderHeroSlidesSchema } } } },
  responses: {
    200: { description: "Reordered", content: { "application/json": { schema: listResponse } } },
    400: { description: "Id set mismatch", content: { "application/json": { schema: errorResponseSchema } } },
  },
});

registry.registerPath({
  method: "delete",
  path: "/hero-slides/{id}",
  tags: ["HeroSlides"],
  summary: "Delete a hero slide",
  security,
  request: { params: heroSlideIdParamSchema },
  responses: {
    204: { description: "Deleted" },
    404: { description: "Not found", content: { "application/json": { schema: errorResponseSchema } } },
  },
});
