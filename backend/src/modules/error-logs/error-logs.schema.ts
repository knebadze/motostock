import { z } from "zod";

// Real server-side pagination (skip/take), unlike most other admin list
// endpoints in this codebase, which fetch everything and paginate
// client-side — the log table has no natural cap the way a category or
// brand list does, so it can grow far larger than those.
// Both optional (defaults applied in the controller, not via zod's
// `.default()`) — an output key zod infers as required-but-defaulted breaks
// Express's route handler overload resolution against the default
// ParsedQs query type (same reasoning as products.schema.ts's
// productListQuerySchema, see its attributeFilters comment).
export const errorLogsQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(100).optional(),
});

export type ErrorLogsQuery = z.infer<typeof errorLogsQuerySchema>;
