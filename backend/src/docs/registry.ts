import { extendZodWithOpenApi, OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";
import { AUTH_COOKIE_NAME } from "../lib/jwt.js";

extendZodWithOpenApi(z);

export const registry = new OpenAPIRegistry();

registry.registerComponent("securitySchemes", "cookieAuth", {
  type: "apiKey",
  in: "cookie",
  name: AUTH_COOKIE_NAME,
  description: "JWT stored in an httpOnly cookie, set by /auth/login or /auth/register.",
});
