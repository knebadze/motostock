import { Router } from "express";
import { z } from "zod";
import { validate } from "../../middleware/validate.middleware.js";
import { authRateLimit } from "../../middleware/rateLimit.middleware.js";
import { registry } from "../../docs/registry.js";
import { errorResponseSchema, userResponseSchema } from "../../docs/schemas.js";
import { login, logout, register } from "./auth.controller.js";
import { loginSchema, registerSchema } from "./auth.schema.js";

export const authRouter = Router();

authRouter.post(
  "/register",
  authRateLimit,
  validate(registerSchema),
  register,
);
authRouter.post("/login", authRateLimit, validate(loginSchema), login);
authRouter.post("/logout", logout);

registry.registerPath({
  method: "post",
  path: "/auth/register",
  tags: ["Auth"],
  summary: "Register a new user and start a session",
  request: {
    body: { content: { "application/json": { schema: registerSchema } } },
  },
  responses: {
    201: {
      description: "User created; session cookie set",
      content: { "application/json": { schema: z.object({ user: userResponseSchema }) } },
    },
    400: {
      description: "Validation failed",
      content: { "application/json": { schema: errorResponseSchema } },
    },
    409: {
      description: "Email already in use",
      content: { "application/json": { schema: errorResponseSchema } },
    },
  },
});

registry.registerPath({
  method: "post",
  path: "/auth/login",
  tags: ["Auth"],
  summary: "Log in with email and password",
  request: {
    body: { content: { "application/json": { schema: loginSchema } } },
  },
  responses: {
    200: {
      description: "Login successful; session cookie set",
      content: { "application/json": { schema: z.object({ user: userResponseSchema }) } },
    },
    401: {
      description: "Invalid email or password",
      content: { "application/json": { schema: errorResponseSchema } },
    },
  },
});

registry.registerPath({
  method: "post",
  path: "/auth/logout",
  tags: ["Auth"],
  summary: "Clear the session cookie",
  responses: {
    204: { description: "Logged out" },
  },
});
