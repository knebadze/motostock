import { z } from "zod";
import { registry } from "../../docs/registry.js";

// page/pageSize both optional (defaults applied in the service, not via
// zod's `.default()`) — same reasoning as newsletter.schema.ts's
// listSubscribersQuerySchema: an output key zod infers as
// required-but-defaulted breaks Express's route handler overload resolution
// against the default ParsedQs query type.
export const listSessionsQuerySchema = z.object({
  search: z.string().trim().min(1).max(200).optional(),
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(100).optional(),
});
export type ListSessionsQuery = z.infer<typeof listSessionsQuerySchema>;

export const sessionIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

const sessionUserSchema = z.object({
  id: z.int(),
  name: z.string(),
  email: z.string(),
});

export const sessionResponseSchema = registry.register(
  "Session",
  z.object({
    id: z.int().openapi({ example: 1 }),
    user: sessionUserSchema,
    ipAddress: z.string().nullable(),
    userAgent: z.string().nullable(),
    createdAt: z.iso.datetime(),
    lastSeenAt: z.iso.datetime(),
  }),
);

// Real server-side pagination (skip/take), same pattern as
// newsletter.schema.ts's newsletterSubscribersPageResponseSchema.
export const sessionsPageResponseSchema = registry.register(
  "SessionsPage",
  z.object({
    items: z.array(sessionResponseSchema),
    total: z.int(),
    page: z.int(),
    pageSize: z.int(),
  }),
);
