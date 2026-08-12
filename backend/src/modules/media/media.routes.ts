import { Router } from "express";
import { z } from "zod";
import { requireAuth, requireRole } from "../../middleware/auth.middleware.js";
import { uploadRateLimit } from "../../middleware/rateLimit.middleware.js";
import { imageUpload } from "../../middleware/upload.middleware.js";
import { registry } from "../../docs/registry.js";
import { errorResponseSchema } from "../../docs/schemas.js";
import { ROLES } from "../../lib/roles.js";
import * as mediaController from "./media.controller.js";
import { uploadRichTextImageResponseSchema } from "./media.schema.js";

export const mediaRouter = Router();

mediaRouter.use(requireAuth, requireRole(ROLES.ADMIN));

mediaRouter.post(
  "/rich-text-image",
  uploadRateLimit,
  imageUpload().single("image"),
  mediaController.uploadRichTextImage,
);

const security = [{ cookieAuth: [] }];

registry.registerPath({
  method: "post",
  path: "/media/rich-text-image",
  tags: ["Media"],
  summary:
    "Upload an image to embed in rich-text content (newsletter body, descriptions, ...) — not tied to any specific entity",
  security,
  request: {
    body: {
      content: {
        "multipart/form-data": {
          schema: z.object({ image: z.string().openapi({ format: "binary" }) }),
        },
      },
    },
  },
  responses: {
    200: {
      description: "Uploaded",
      content: { "application/json": { schema: uploadRichTextImageResponseSchema } },
    },
    400: { description: "Invalid file", content: { "application/json": { schema: errorResponseSchema } } },
  },
});
