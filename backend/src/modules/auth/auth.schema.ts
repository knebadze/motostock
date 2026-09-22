import { z } from "zod";
import { registry } from "../../docs/registry.js";
import { emailSchema } from "../../lib/email.js";
import { phoneField } from "../../lib/phone.js";
import { dateOfBirthField } from "../../lib/date-of-birth.js";

export const registerSchema = registry.register(
  "RegisterInput",
  z.object({
    firstName: z.string().min(2).max(50).openapi({ example: "Nika" }),
    lastName: z.string().min(2).max(50).openapi({ example: "Beridze" }),
    email: emailSchema.openapi({ example: "rider@motostock.ge" }),
    password: z.string().min(8).max(100).openapi({ example: "supersecret123" }),
    // Also the walk-in-customer auto-merge key — see auth.service.ts's
    // register for why this is required here (unlike User.phone, which is
    // nullable on the model for pre-existing rows and OAuth signups).
    phone: phoneField,
    dateOfBirth: dateOfBirthField,
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
