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

// page/pageSize both optional (defaults applied in the controller, not via
// zod's `.default()`) — an output key zod infers as required-but-defaulted
// breaks Express's route handler overload resolution against the default
// ParsedQs query type (same reasoning as error-logs.schema.ts's
// errorLogsQuerySchema).
export const listUsersQuerySchema = z.object({
  q: z.string().trim().min(1).max(200).optional(),
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(100).optional(),
});
export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;
