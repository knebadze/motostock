import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../../middleware/auth.middleware.js";
import { validate } from "../../middleware/validate.middleware.js";
import { registry } from "../../docs/registry.js";
import { errorResponseSchema } from "../../docs/schemas.js";
import * as vinDecodeController from "./vin-decode.controller.js";
import { decodeVinSchema, vinDecodeResultSchema } from "./vin-decode.schema.js";

export const vinDecodeRouter = Router();

vinDecodeRouter.use(requireAuth);

vinDecodeRouter.post("/", validate(decodeVinSchema), vinDecodeController.decode);

const security = [{ cookieAuth: [] }];
const resultResponse = z.object({ result: vinDecodeResultSchema });

registry.registerPath({
  method: "post",
  path: "/vin-decode",
  tags: ["VinDecode"],
  summary: "Decode a VIN into year/engine specs using the admin-configured provider",
  security,
  request: { body: { content: { "application/json": { schema: decodeVinSchema } } } },
  responses: {
    200: { description: "Decoded result", content: { "application/json": { schema: resultResponse } } },
    400: { description: "Invalid VIN or feature disabled", content: { "application/json": { schema: errorResponseSchema } } },
    401: { description: "Not authenticated", content: { "application/json": { schema: errorResponseSchema } } },
    502: { description: "Provider request failed", content: { "application/json": { schema: errorResponseSchema } } },
  },
});
