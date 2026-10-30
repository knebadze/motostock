import { z } from "zod";
import { registry } from "../../docs/registry.js";
import { phoneField } from "../../lib/phone.js";

export const callbackRequestStatusSchema = z.enum(["OPEN", "RESOLVED"]);

export const createCallbackRequestSchema = registry.register(
  "CreateCallbackRequestInput",
  z.object({
    vehicleListingId: z.int().positive(),
    name: z.string().trim().min(2).max(100),
    phone: phoneField,
    preferredTime: z.string().trim().max(100).optional(),
    note: z.string().trim().max(1000).optional(),
  }),
);
export type CreateCallbackRequestInput = z.infer<typeof createCallbackRequestSchema>;

export const callbackRequestIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const listCallbackRequestsQuerySchema = z.object({
  status: callbackRequestStatusSchema.optional(),
});
export type ListCallbackRequestsQuery = z.infer<typeof listCallbackRequestsQuerySchema>;

export const resolveCallbackRequestSchema = registry.register(
  "ResolveCallbackRequestInput",
  z.object({ adminNote: z.string().trim().max(1000).optional() }),
);
export type ResolveCallbackRequestInput = z.infer<typeof resolveCallbackRequestSchema>;

export const callbackRequestResponseSchema = registry.register(
  "CallbackRequest",
  z.object({
    id: z.int(),
    itemTitle: z.string(),
    // null once the listing was deleted.
    vehicleListing: z.object({ id: z.int() }).nullable(),
    name: z.string(),
    phone: z.string(),
    preferredTime: z.string().nullable(),
    note: z.string().nullable(),
    status: callbackRequestStatusSchema,
    adminNote: z.string().nullable(),
    createdAt: z.iso.datetime(),
    resolvedAt: z.iso.datetime().nullable(),
    resolvedBy: z.object({ firstName: z.string(), lastName: z.string() }).nullable(),
  }),
);
