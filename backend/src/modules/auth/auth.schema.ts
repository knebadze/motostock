import { z } from "zod";
import { registry } from "../../docs/registry.js";
import { emailSchema } from "../../lib/email.js";

export const registerSchema = registry.register(
  "RegisterInput",
  z.object({
    firstName: z.string().min(2).max(50).openapi({ example: "Nika" }),
    lastName: z.string().min(2).max(50).openapi({ example: "Beridze" }),
    email: emailSchema.openapi({ example: "rider@motostock.ge" }),
    password: z.string().min(8).max(100).openapi({ example: "supersecret123" }),
  }),
);
export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = registry.register(
  "LoginInput",
  z.object({
    email: emailSchema.openapi({ example: "rider@motostock.ge" }),
    password: z.string().min(1).openapi({ example: "supersecret123" }),
  }),
);
export type LoginInput = z.infer<typeof loginSchema>;

export const forgotPasswordSchema = registry.register(
  "ForgotPasswordInput",
  z.object({
    email: emailSchema.openapi({ example: "rider@motostock.ge" }),
  }),
);
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = registry.register(
  "ResetPasswordInput",
  z.object({
    token: z.string().min(1),
    password: z.string().min(8).max(100).openapi({ example: "supersecret123" }),
  }),
);
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

export const verifyEmailSchema = registry.register(
  "VerifyEmailInput",
  z.object({
    token: z.string().min(1),
  }),
);
export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;
