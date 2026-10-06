import { Router } from "express";
import { validate } from "../../middleware/validate.middleware.js";
import { registry } from "../../docs/registry.js";
import { errorResponseSchema } from "../../docs/schemas.js";
import * as shareImageController from "./share-image.controller.js";
import { shareImageQuerySchema } from "./share-image.schema.js";

// Public — fetched by chat apps' and social networks' link-preview crawlers.
export const shareImageRouter = Router();

shareImageRouter.get("/", validate(shareImageQuerySchema, "query"), shareImageController.getShareImage);

registry.registerPath({
  method: "get",
  path: "/share-image",
  tags: ["Media"],
  summary: "An uploaded image as a 1200×630 JPEG for link previews (og:image) — public",
  request: { query: shareImageQuerySchema },
  responses: {
    200: { description: "JPEG image", content: { "image/jpeg": { schema: { type: "string", format: "binary" } } } },
    400: { description: "Invalid path", content: { "application/json": { schema: errorResponseSchema } } },
    404: { description: "Image not found", content: { "application/json": { schema: errorResponseSchema } } },
  },
});
