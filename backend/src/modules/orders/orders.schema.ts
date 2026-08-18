import { z } from "zod";
import { registry } from "../../docs/registry.js";
import { localizedStringSchema } from "../../lib/localized.js";
import { cartItemTypeSchema } from "../cart/cart.schema.js";
import { lookupItemResponseSchema } from "../lookups/lookups.schema.js";

export const orderFulfillmentMethodSchema = z.enum(["CARD", "COURIER", "PICKUP"]);
export const orderDeliverySpeedSchema = z.enum(["STANDARD", "EXPRESS"]);

export const checkoutInputSchema = registry.register(
  "CheckoutInput",
  z
    .object({
      fulfillmentMethod: orderFulfillmentMethodSchema,
      addressId: z.int().positive().optional(),
      deliverySpeed: orderDeliverySpeedSchema.optional(),
      promoCode: z.string().trim().min(1).max(30).optional(),
      bankId: z.int().positive().optional(),
      // Client-generated once per checkout session (see orders.service.ts's
      // placeOrder) and resent unchanged on every retry — required on both
      // this and the preview route since they share one schema, but only
      // placeOrder actually reads it.
      idempotencyKey: z.string().trim().min(1).max(100),
    })
    .superRefine((data, ctx) => {
      if (data.fulfillmentMethod !== "PICKUP" && data.addressId == null) {
        ctx.addIssue({
          code: "custom",
          message: "კურიერით მიწოდებისას მისამართის მითითება საჭიროა",
          path: ["addressId"],
        });
      }
      if (data.fulfillmentMethod === "CARD" && data.bankId == null) {
        ctx.addIssue({
          code: "custom",
          message: "ბარათით გადახდისას ბანკის მითითება საჭიროა",
          path: ["bankId"],
        });
      }
    }),
);
export type CheckoutInput = z.infer<typeof checkoutInputSchema>;

export const orderIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

// Cross-field rule ("reason required when the target status is CANCELLED")
// isn't checked here — this schema only sees statusId, not the status's
// key, and the mapping is a DB row (OrderStatus is admin-editable, not a
// fixed enum). That check happens in orders.service.ts's updateOrderStatus.
export const updateOrderStatusSchema = registry.register(
  "UpdateOrderStatusInput",
  z.object({
    statusId: z.int().positive(),
    cancellationReasonId: z.int().positive().optional(),
    cancellationNote: z.string().trim().min(1).optional(),
  }),
);
export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;

const shippingSnapshotSchema = z.object({
  phone: z.string(),
  city: z.object({
    id: z.int(),
    key: z.string(),
    nameKa: z.string(),
    nameEn: z.string(),
    nameRu: z.string(),
    isTbilisi: z.boolean(),
  }),
  street: z.string(),
  building: z.string().nullable(),
  apartment: z.string().nullable(),
  postalCode: z.string().nullable(),
});

const promoCodeSummarySchema = z.object({
  code: z.string(),
  discountPercent: z.number(),
});

// id is null in a checkout preview (nothing persisted yet) and set once the
// order is actually placed — same shape reused for both so the frontend
// doesn't need two near-identical item types.
export const orderItemResponseSchema = registry.register(
  "OrderItem",
  z.object({
    id: z.int().nullable(),
    itemType: cartItemTypeSchema,
    // Only set for product items (null for vehicle listings) — lets the
    // admin order-detail view correlate a FINA stock-sync result (see
    // fina-sync module's syncOrderStock) back to the matching line item.
    productVariantId: z.int().nullable(),
    itemName: localizedStringSchema,
    imageUrl: z.string().nullable(),
    quantity: z.int(),
    unitPrice: z.number().openapi({ example: 89.99 }),
    lineTotal: z.number().openapi({ example: 179.98 }),
  }),
);

// Extends the shared item shape with a live stock status — only meaningful
// in a preview (freshly FINA-synced, see orders.service.ts's
// computeCheckoutTotals), not on a placed order's persisted items.
const checkoutPreviewItemResponseSchema = orderItemResponseSchema.extend({
  inStock: z.boolean(),
  availableQuantity: z.int(),
});

export const checkoutPreviewResponseSchema = registry.register(
  "CheckoutPreview",
  z.object({
    items: z.array(checkoutPreviewItemResponseSchema),
    subtotal: z.number(),
    discountTotal: z.number(),
    deliverySpeed: orderDeliverySpeedSchema.nullable(),
    deliveryCost: z.number(),
    deliveryTimeSnapshot: z.string().nullable(),
    total: z.number(),
    promoCode: promoCodeSummarySchema.nullable(),
    // True if any item's requested quantity exceeds live stock — the
    // frontend should block order placement while this is true.
    hasStockIssues: z.boolean(),
  }),
);

const orderBankSchema = z.object({
  id: z.int(),
  key: z.string(),
  name: localizedStringSchema,
  logoUrl: z.string().nullable(),
});

export const orderResponseSchema = registry.register(
  "Order",
  z.object({
    id: z.int().openapi({ example: 1 }),
    orderCode: z.string().openapi({ example: "4K7QRX9P" }),
    status: lookupItemResponseSchema,
    fulfillmentMethod: orderFulfillmentMethodSchema,
    shippingSnapshot: shippingSnapshotSchema.nullable(),
    promoCode: promoCodeSummarySchema.nullable(),
    bank: orderBankSchema.nullable(),
    items: z.array(orderItemResponseSchema),
    subtotal: z.number(),
    discountTotal: z.number(),
    deliverySpeed: orderDeliverySpeedSchema.nullable(),
    deliveryCost: z.number(),
    deliveryTimeSnapshot: z.string().nullable(),
    total: z.number(),
    createdAt: z.iso.datetime(),
  }),
);

export const orderSummaryResponseSchema = registry.register(
  "OrderSummary",
  z.object({
    id: z.int(),
    orderCode: z.string(),
    status: lookupItemResponseSchema,
    total: z.number(),
    itemCount: z.int(),
    createdAt: z.iso.datetime(),
    // Estimated, not a hard commitment — parsed from deliveryTimeSnapshot's
    // free text (see orders.service.ts's computeEstimatedDeliveryDate). Null
    // for PICKUP orders (no delivery time snapshot exists) or if the text
    // didn't contain a parseable number.
    estimatedDeliveryDate: z.iso.datetime().nullable(),
  }),
);

// "Buy again" result — one entry per line item on the source order, not per
// cart row, so the frontend can show exactly why each original item did or
// didn't make it back into the cart (see orders.service.ts's reorderOrder).
export const reorderItemStatusSchema = z.enum(["ADDED", "PARTIAL", "UNAVAILABLE"]);

export const reorderItemResultSchema = registry.register(
  "ReorderItemResult",
  z.object({
    itemName: localizedStringSchema,
    requestedQuantity: z.int(),
    addedQuantity: z.int(),
    status: reorderItemStatusSchema,
  }),
);

export const reorderResultResponseSchema = registry.register(
  "ReorderResult",
  z.object({ items: z.array(reorderItemResultSchema) }),
);

// Admin-only surface below — every route using these is gated by
// requireRole(ROLES.ADMIN) in orders.routes.ts, not just requireAuth.

const buyerSummarySchema = z.object({
  id: z.int(),
  firstName: z.string(),
  lastName: z.string(),
  email: z.email(),
});

// ?statusIds=1&statusIds=2 parses to a string[] via qs, but a single
// ?statusIds=1 parses to a bare string — normalize both into an array
// before coercing, same pattern as wishlist.schema.ts's idListQuerySchema.
const idListQuerySchema = z
  .preprocess(
    (value) => (value == null ? undefined : Array.isArray(value) ? value : [value]),
    z.array(z.coerce.number().int().positive()),
  )
  .optional();

const fulfillmentMethodListQuerySchema = z
  .preprocess(
    (value) => (value == null ? undefined : Array.isArray(value) ? value : [value]),
    z.array(orderFulfillmentMethodSchema),
  )
  .optional();

export const listOrdersQuerySchema = z.object({
  search: z.string().trim().min(1).max(100).optional(),
  statusIds: idListQuerySchema,
  fulfillmentMethods: fulfillmentMethodListQuerySchema,
  createdFrom: z.iso.date().optional(),
  createdTo: z.iso.date().optional(),
  // Narrows to orders with at least one OrderRiskFlag row — see
  // fraud.service.ts's evaluateOrderRisk (admin-only, flag-for-review, never
  // an automatic block).
  flaggedOnly: z.coerce.boolean().optional(),
});
export type ListOrdersQuery = z.infer<typeof listOrdersQuerySchema>;

export const orderRiskFlagTypeSchema = z.enum([
  "NEW_ACCOUNT_HIGH_VALUE",
  "ORDER_VELOCITY",
  "PROMO_CODE_MULTI_ACCOUNT",
  "SHARED_IP_MULTIPLE_ACCOUNTS",
]);

export const orderRiskFlagResponseSchema = registry.register(
  "OrderRiskFlag",
  z.object({
    type: orderRiskFlagTypeSchema,
    detail: z.string().nullable(),
    createdAt: z.iso.datetime(),
  }),
);

export const adminOrderSummaryResponseSchema = registry.register(
  "AdminOrderSummary",
  orderSummaryResponseSchema.extend({
    fulfillmentMethod: orderFulfillmentMethodSchema,
    buyer: buyerSummarySchema,
    hasRiskFlags: z.boolean(),
  }),
);

export const adminOrderResponseSchema = registry.register(
  "AdminOrder",
  orderResponseSchema.extend({
    buyer: buyerSummarySchema,
    riskFlags: z.array(orderRiskFlagResponseSchema),
    cancellationReason: lookupItemResponseSchema.nullable(),
    cancellationNote: z.string().nullable(),
  }),
);
