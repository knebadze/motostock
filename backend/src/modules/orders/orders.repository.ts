import { ApiError } from "../../lib/ApiError.js";
import { prisma } from "../../config/prisma.js";
import type { CartItemType, OrderFulfillmentMethod, Prisma } from "../../generated/prisma/index.js";

const orderItemsInclude = { items: { orderBy: { id: "asc" } }, status: true } as const;

export type PlaceOrderItemInput = {
  itemType: CartItemType;
  productVariantId?: number | null;
  vehicleListingId?: number | null;
  itemNameKa: string;
  itemNameEn: string;
  itemNameRu: string;
  imageUrl?: string | null;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

export type PlaceOrderInput = {
  orderCode: string;
  userId: number;
  fulfillmentMethod: OrderFulfillmentMethod;
  statusId: number;
  addressId?: number | null;
  shippingSnapshot?: Prisma.InputJsonValue;
  promoCodeId?: number | null;
  promoCodeSnapshot?: string | null;
  promoDiscountPercent?: number | null;
  subtotal: number;
  discountTotal: number;
  total: number;
  items: PlaceOrderItemInput[];
};

export const ordersRepository = {
  findByUserId(userId: number) {
    return prisma.order.findMany({
      where: { userId },
      include: { items: { select: { quantity: true } }, status: true },
      orderBy: { createdAt: "desc" },
    });
  },

  findById(id: number) {
    return prisma.order.findUnique({ where: { id }, include: orderItemsInclude });
  },

  // Atomically re-checks + decrements stock for every line, creates the
  // Order + OrderItem rows, and empties the buyer's cart — all inside one
  // transaction, so a stock shortfall on any single line rolls the whole
  // checkout back instead of leaving a partially-decremented cart. No
  // reservation/lock system exists anywhere in this codebase (see
  // cart.service.ts's own soft stock checks); this conditional
  // updateMany-then-check-count is the same atomicity guarantee without
  // needing one.
  async placeOrder(input: PlaceOrderInput) {
    return prisma.$transaction(async (tx) => {
      for (const item of input.items) {
        if (item.productVariantId != null) {
          const result = await tx.productVariant.updateMany({
            where: { id: item.productVariantId, stockQuantity: { gte: item.quantity } },
            data: { stockQuantity: { decrement: item.quantity } },
          });
          if (result.count === 0) {
            throw new ApiError(409, `"${item.itemNameKa}" — მარაგში საკმარისი რაოდენობა აღარ არის`);
          }
        } else if (item.vehicleListingId != null) {
          const result = await tx.vehicleListing.updateMany({
            where: { id: item.vehicleListingId, stockQuantity: { gte: item.quantity } },
            data: { stockQuantity: { decrement: item.quantity } },
          });
          if (result.count === 0) {
            throw new ApiError(409, `"${item.itemNameKa}" — აღარ არის ხელმისაწვდომი`);
          }
        }
      }

      const { items, ...orderData } = input;
      const order = await tx.order.create({ data: orderData });
      await tx.orderItem.createMany({
        data: items.map((item) => ({ ...item, orderId: order.id })),
      });
      await tx.cartItem.deleteMany({ where: { userId: input.userId } });

      return tx.order.findUniqueOrThrow({ where: { id: order.id }, include: orderItemsInclude });
    });
  },
};
