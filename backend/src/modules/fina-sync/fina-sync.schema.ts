import { z } from "zod";
import { registry } from "../../docs/registry.js";
import { adminOrderResponseSchema } from "../orders/orders.schema.js";

export const finaSyncRunResponseSchema = registry.register(
  "FinaSyncRun",
  z.object({
    id: z.int(),
    trigger: z.enum(["SCHEDULED", "MANUAL", "CHECKOUT"]),
    status: z.enum(["RUNNING", "SUCCESS", "FAILED", "PARTIAL"]),
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

// POST /fina-sync/orders/{orderId} only — fina-sync.controller.ts's syncOrder
// adds the order itself when every linked item was confirmed and a still-
// PENDING order got auto-confirmed (null otherwise), so the admin modal can
// swap in the updated order. Was undocumented until the frontend's types
// started being generated from these schemas.
export const orderStockSyncWithOrderResultSchema = registry.register(
  "OrderStockSyncWithOrderResult",
  orderStockSyncResultSchema.extend({
    order: adminOrderResponseSchema.nullable(),
  }),
);

export const orderIdParamSchema = z.object({
  orderId: z.coerce.number().int().positive(),
});

export const productIdParamSchema = z.object({
  productId: z.coerce.number().int().positive(),
});
