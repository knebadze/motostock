import { z } from "zod";
import { registry } from "../../docs/registry.js";
import { localizedStringSchema } from "../../lib/localized.js";
import { cartItemTypeSchema } from "../cart/cart.schema.js";
import { lookupItemResponseSchema } from "../lookups/lookups.schema.js";

export const orderFulfillmentMethodSchema = z.enum(["CARD", "COURIER", "PICKUP"]);

export const checkoutInputSchema = registry.register(
  "CheckoutInput",
  z
    .object({
      fulfillmentMethod: orderFulfillmentMethodSchema,
      addressId: z.int().positive().optional(),
      promoCode: z.string().trim().min(1).max(30).optional(),
    })
    .superRefine((data, ctx) => {
      if (data.fulfillmentMethod !== "PICKUP" && data.addressId == null) {
        ctx.addIssue({
          code: "custom",
          message: "კურიერით მიწოდებისას მისამართის მითითება საჭიროა",
          path: ["addressId"],
        });
      }
    }),
);
export type CheckoutInput = z.infer<typeof checkoutInputSchema>;

export const orderIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

const shippingSnapshotSchema = z.object({
  phone: z.string(),
  city: z.object({
    id: z.int(),
    key: z.string(),
    nameKa: z.string(),
    nameEn: z.string(),
    nameRu: z.string(),
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
    itemName: localizedStringSchema,
    imageUrl: z.string().nullable(),
    quantity: z.int(),
    unitPrice: z.number().openapi({ example: 89.99 }),
    lineTotal: z.number().openapi({ example: 179.98 }),
  }),
);

export const checkoutPreviewResponseSchema = registry.register(
  "CheckoutPreview",
  z.object({
    items: z.array(orderItemResponseSchema),
    subtotal: z.number(),
    discountTotal: z.number(),
    total: z.number(),
    promoCode: promoCodeSummarySchema.nullable(),
  }),
);

export const orderResponseSchema = registry.register(
  "Order",
  z.object({
    id: z.int().openapi({ example: 1 }),
    orderCode: z.string().openapi({ example: "MS-20260806-4K7QRX" }),
    status: lookupItemResponseSchema,
    fulfillmentMethod: orderFulfillmentMethodSchema,
    shippingSnapshot: shippingSnapshotSchema.nullable(),
    promoCode: promoCodeSummarySchema.nullable(),
    items: z.array(orderItemResponseSchema),
    subtotal: z.number(),
    discountTotal: z.number(),
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
  }),
);
