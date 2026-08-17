import { z } from "zod";
import { registry } from "../../docs/registry.js";

export const finaSyncRunResponseSchema = registry.register(
  "FinaSyncRun",
  z.object({
    id: z.int(),
    trigger: z.enum(["SCHEDULED", "MANUAL"]),
    status: z.enum(["SUCCESS", "FAILED", "PARTIAL"]),
    startedAt: z.iso.datetime(),
    finishedAt: z.iso.datetime().nullable(),
    variantsChecked: z.int(),
    variantsUpdated: z.int(),
    errorMessage: z.string().nullable(),
    triggeredBy: z.object({ id: z.int(), name: z.string() }).nullable(),
  }),
);
export type FinaSyncRunResponse = z.infer<typeof finaSyncRunResponseSchema>;

export const orderStockSyncResultSchema = registry.register(
  "OrderStockSyncResult",
  z.object({
    checked: z.int(),
    updated: z.int(),
    items: z.array(
      z.object({
        productVariantId: z.int(),
        previousStock: z.int(),
        newStock: z.int().nullable(),
      }),
    ),
  }),
);
export type OrderStockSyncResult = z.infer<typeof orderStockSyncResultSchema>;

export const orderIdParamSchema = z.object({
  orderId: z.coerce.number().int().positive(),
});
