import { z } from "zod";
import { registry } from "../../docs/registry.js";

export const changePasswordSchema = registry.register(
  "ChangePasswordInput",
  z.object({
    // Optional at the schema level — OAuth-only accounts (no passwordHash
    // yet) have nothing to confirm; whether it's actually required for a
    // given user is checked in the service against their stored hash.
    currentPassword: z.string().min(1).optional(),
    newPassword: z.string().min(8).max(100).openapi({ example: "supersecret123" }),
  }),
);
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

export const userIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const listUsersQuerySchema = z.object({
  q: z.string().trim().min(1).max(200).optional(),
});
