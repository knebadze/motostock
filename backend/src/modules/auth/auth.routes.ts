import { Router } from "express";
import { z } from "zod";
import { validate } from "../../middleware/validate.middleware.js";
import { authRateLimit } from "../../middleware/rateLimit.middleware.js";
import { registry } from "../../docs/registry.js";
import { errorResponseSchema, userResponseSchema } from "../../docs/schemas.js";
import { forgotPassword, login, logout, register, resetPasswordHandler } from "./auth.controller.js";
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
} from "./auth.schema.js";

export const authRouter = Router();

authRouter.post(
  "/register",
  authRateLimit,
  validate(registerSchema),
  register,
);
authRouter.post("/login", authRateLimit, validate(loginSchema), login);
authRouter.post("/logout", logout);
authRouter.post(
  "/forgot-password",
  authRateLimit,
  validate(forgotPasswordSchema),
  forgotPassword,
);
authRouter.post(
  "/reset-password",
  authRateLimit,
  validate(resetPasswordSchema),
  resetPasswordHandler,
);

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

registry.registerPath({
  method: "post",
  path: "/auth/forgot-password",
  tags: ["Auth"],
  summary: "Request a password reset email",
  request: {
    body: { content: { "application/json": { schema: forgotPasswordSchema } } },
  },
  responses: {
    200: {
      description: "Same response whether or not the email is registered, to avoid leaking account existence",
      content: { "application/json": { schema: z.object({ message: z.string() }) } },
    },
    400: {
      description: "Email sending is not configured",
      content: { "application/json": { schema: errorResponseSchema } },
    },
  },
});

registry.registerPath({
  method: "post",
  path: "/auth/reset-password",
  tags: ["Auth"],
  summary: "Reset password using a token from the reset email",
  request: {
    body: { content: { "application/json": { schema: resetPasswordSchema } } },
  },
  responses: {
    200: {
      description: "Password reset; session cookie set",
      content: { "application/json": { schema: z.object({ user: userResponseSchema }) } },
    },
    400: {
      description: "Token invalid or expired",
      content: { "application/json": { schema: errorResponseSchema } },
    },
  },
});
