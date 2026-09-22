import { z } from "zod";
import { registry } from "../../docs/registry.js";
import { phoneField } from "../../lib/phone.js";
import { dateOfBirthField } from "../../lib/date-of-birth.js";

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

// Admin workshop "+ ახალი სტუმარი მომხმარებელი" action — see
// users.service.ts's createWalkInUser. No email/password: this customer
// never logs in as themselves until (if ever) they self-register, at which
// point auth.service.ts's registerUser matches them by phone and converts
// this same row in place.
export const createWalkInUserSchema = registry.register(
  "CreateWalkInUserInput",
  z.object({
    firstName: z.string().trim().min(2).max(50).openapi({ example: "Nika" }),
    lastName: z.string().trim().min(2).max(50).openapi({ example: "Beridze" }),
    phone: phoneField,
    dateOfBirth: dateOfBirthField,
  }),
);
export type CreateWalkInUserInput = z.infer<typeof createWalkInUserSchema>;

// Admin manual-merge fallback (users.service.ts's mergeUserInto) — path
// params only, no body.
export const mergeUserParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
  targetUserId: z.coerce.number().int().positive(),
});
