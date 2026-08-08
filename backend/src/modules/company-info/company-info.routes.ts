import { Router } from "express";
import { z } from "zod";
import { requireAuth, requireRole } from "../../middleware/auth.middleware.js";
import { validate } from "../../middleware/validate.middleware.js";
import { imageUpload } from "../../middleware/upload.middleware.js";
import { registry } from "../../docs/registry.js";
import { errorResponseSchema } from "../../docs/schemas.js";
import { ROLES } from "../../lib/roles.js";
import * as companyInfoController from "./company-info.controller.js";
import { companyInfoResponseSchema, updateCompanyInfoSchema } from "./company-info.schema.js";

export const companyInfoRouter = Router();

// Public: the Footer and Contact page read this on every guest page load —
// none of it is sensitive, it's meant for public display. Same
// public-GET/admin-write pattern as lookups.routes.ts.
companyInfoRouter.get("/", companyInfoController.getOne);

companyInfoRouter.use(requireAuth, requireRole(ROLES.ADMIN));

companyInfoRouter.patch("/", validate(updateCompanyInfoSchema), companyInfoController.update);
companyInfoRouter.post("/logo", imageUpload().single("logo"), companyInfoController.uploadLogo);

const security = [{ cookieAuth: [] }];
const companyInfoWrapperResponse = z.object({ companyInfo: companyInfoResponseSchema });

registry.registerPath({
  method: "get",
  path: "/company-info",
  tags: ["CompanyInfo"],
  summary: "Get the company info record (public)",
  responses: {
    200: {
      description: "Company info",
      content: { "application/json": { schema: companyInfoWrapperResponse } },
    },
  },
});

registry.registerPath({
  method: "patch",
  path: "/company-info",
  tags: ["CompanyInfo"],
  summary: "Update the company info record (admin only)",
  security,
  request: { body: { content: { "application/json": { schema: updateCompanyInfoSchema } } } },
  responses: {
    200: {
      description: "Updated",
      content: { "application/json": { schema: companyInfoWrapperResponse } },
    },
    401: { description: "Not authenticated", content: { "application/json": { schema: errorResponseSchema } } },
    403: { description: "Insufficient permissions", content: { "application/json": { schema: errorResponseSchema } } },
  },
});

registry.registerPath({
  method: "post",
  path: "/company-info/logo",
  tags: ["CompanyInfo"],
  summary: "Upload the company logo (admin only)",
  security,
  request: {
    body: {
      content: {
        "multipart/form-data": {
          schema: z.object({ logo: z.string().openapi({ format: "binary" }) }),
        },
      },
    },
  },
  responses: {
    200: {
      description: "Uploaded",
      content: { "application/json": { schema: companyInfoWrapperResponse } },
    },
    400: { description: "Invalid file", content: { "application/json": { schema: errorResponseSchema } } },
    401: { description: "Not authenticated", content: { "application/json": { schema: errorResponseSchema } } },
    403: { description: "Insufficient permissions", content: { "application/json": { schema: errorResponseSchema } } },
  },
});
