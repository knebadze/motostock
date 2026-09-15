import { z } from "zod";
import { registry } from "../../docs/registry.js";

export const bulkDiscountEventTargetTypeSchema = z.enum(["PRODUCT", "VEHICLE_LISTING"]);
export type BulkDiscountEventTargetType = z.infer<typeof bulkDiscountEventTargetTypeSchema>;

// Embedded (as an optional sub-object) into bulk-discounts.schema.ts's own
// apply-input schema — grouping a bulk apply under a named event is opt-in
// there, never a field of its own
// standalone create endpoint (there isn't one — an event is only ever born
// alongside a batch of discounts, see applyBulk*Discounts).
export const bulkDiscountEventInputSchema = registry.register(
  "BulkDiscountEventInput",
  z.object({
    // All three locales required, same "no partial translation" rule
    // hero-slides.service.ts's assertButtonLabelPresent already applies to
    // CTA/DISCOUNT slide button labels — this event is headed for the same
    // kind of customer-facing surfaces (a later phase).
    nameKa: z.string().trim().min(1).max(200),
    nameEn: z.string().trim().min(1).max(200),
    nameRu: z.string().trim().min(1).max(200),
    descriptionKa: z.string().trim().max(2000).optional(),
    descriptionEn: z.string().trim().max(2000).optional(),
    descriptionRu: z.string().trim().max(2000).optional(),
  }),
);
export type BulkDiscountEventInput = z.infer<typeof bulkDiscountEventInputSchema>;

export const bulkDiscountEventIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

// page/pageSize both optional (defaults applied in the service) — same
// reasoning as every other admin list query schema in this codebase (e.g.
// newsletter.schema.ts's listSubscribersQuerySchema).
export const listBulkDiscountEventsQuerySchema = z.object({
  targetType: bulkDiscountEventTargetTypeSchema.optional(),
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(100).optional(),
});
export type ListBulkDiscountEventsQuery = z.infer<typeof listBulkDiscountEventsQuerySchema>;

export const repeatBulkDiscountEventSchema = registry.register(
  "RepeatBulkDiscountEventInput",
  z
    .object({
      startDate: z.iso.date(),
      endDate: z.iso.date(),
    })
    .refine((data) => new Date(data.endDate) > new Date(data.startDate), {
      message: "დასრულების თარიღი უნდა იყოს დაწყების თარიღის შემდეგ",
      path: ["endDate"],
    }),
);
export type RepeatBulkDiscountEventInput = z.infer<typeof repeatBulkDiscountEventSchema>;

export const bulkDiscountEventResponseSchema = registry.register(
  "BulkDiscountEvent",
  z.object({
    id: z.int(),
    nameKa: z.string(),
    nameEn: z.string(),
    nameRu: z.string(),
    descriptionKa: z.string().nullable(),
    descriptionEn: z.string().nullable(),
    descriptionRu: z.string().nullable(),
    imageUrl: z.string().nullable(),
    targetType: bulkDiscountEventTargetTypeSchema,
    discountPercent: z.number(),
    startDate: z.iso.date(),
    endDate: z.iso.date(),
    itemCount: z.int(),
    createdAt: z.iso.datetime(),
  }),
);

export const bulkDiscountEventsPageResponseSchema = registry.register(
  "BulkDiscountEventsPage",
  z.object({
    items: z.array(bulkDiscountEventResponseSchema),
    total: z.int(),
    page: z.int(),
    pageSize: z.int(),
  }),
);
