import { ApiError } from "../../lib/ApiError.js";
import { prisma } from "../../config/prisma.js";
import type {
  CartItemType,
  OrderDeliverySpeed,
  OrderFulfillmentMethod,
  Prisma,
} from "../../generated/prisma/index.js";

const buyerSelect = { id: true, firstName: true, lastName: true, email: true } as const;

// Also used by the admin single-order detail lookup (see orders.service.ts's
// getAnyOrder) — the customer-facing toOrderResponse simply never reads
// `order.user`, so including it here is harmless for that path.
const orderItemsInclude = {
  items: { orderBy: { id: "asc" } },
  status: true,
  user: { select: buyerSelect },
} as const;

function buildAdminWhere(filters: {
  search?: string;
  statusIds?: number[];
  fulfillmentMethods?: OrderFulfillmentMethod[];
  createdFrom?: string;
  createdTo?: string;
}): Prisma.OrderWhereInput | undefined {
  const and: Prisma.OrderWhereInput[] = [];

  if (filters.search) {
    and.push({
      OR: [
        { orderCode: { contains: filters.search, mode: "insensitive" } },
        { user: { firstName: { contains: filters.search, mode: "insensitive" } } },
        { user: { lastName: { contains: filters.search, mode: "insensitive" } } },
        { user: { email: { contains: filters.search, mode: "insensitive" } } },
      ],
    });
  }

  if (filters.statusIds && filters.statusIds.length > 0) {
    and.push({ statusId: { in: filters.statusIds } });
  }

  if (filters.fulfillmentMethods && filters.fulfillmentMethods.length > 0) {
    and.push({ fulfillmentMethod: { in: filters.fulfillmentMethods } });
  }

  if (filters.createdFrom || filters.createdTo) {
    and.push({
      createdAt: {
        ...(filters.createdFrom ? { gte: new Date(filters.createdFrom) } : {}),
        ...(filters.createdTo ? { lte: new Date(filters.createdTo) } : {}),
      },
    });
  }

  return and.length > 0 ? { AND: and } : undefined;
}

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
  deliverySpeed?: OrderDeliverySpeed | null;
  deliveryCost: number;
  deliveryTimeSnapshot?: string | null;
  total: number;
  items: PlaceOrderItemInput[];
  // Resolved once by orders.service.ts (same "look up the lookup row by
  // its stable key" pattern as statusId/PENDING above) — applied below to
  // whichever variant/listing rows this order's decrements actually drove
  // to zero stock.
  soldStatusId: number;
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

  // Admin-only: every user's orders, not scoped to a single owner. No
  // skip/take anywhere in this codebase's admin list endpoints — every one
  // returns its full filtered result set and pagination happens client-side
  // (see usePagination on the frontend), so this follows the same shape.
  findManyAdmin(filters: {
    search?: string;
    statusIds?: number[];
    fulfillmentMethods?: OrderFulfillmentMethod[];
    createdFrom?: string;
    createdTo?: string;
  }) {
    return prisma.order.findMany({
      where: buildAdminWhere(filters),
      include: { items: { select: { quantity: true } }, status: true, user: { select: buyerSelect } },
      orderBy: { createdAt: "desc" },
    });
  },

  // Atomically re-checks + decrements stock for every line, creates the
  // Order + OrderItem rows, and empties the buyer's cart — all inside one
  // transaction, so a stock shortfall on any single line rolls the whole
  // checkout back instead of leaving a partially-decremented cart. No
  // reservation/lock system exists anywhere in this codebase (see
  // cart.service.ts's own soft stock checks); this conditional
  // updateMany-then-check-count is the same atomicity guarantee without
  // needing one. Whichever rows this decrement actually drives to zero (or
  // below, in the unlikely case two decrements race past the gte check on
  // different lines of the same order) get flipped to the SOLD status —
  // a second conditional updateMany, scoped by the post-decrement value, so
  // no extra read-back of the row is needed.
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
          await tx.productVariant.updateMany({
            where: { id: item.productVariantId, stockQuantity: { lte: 0 } },
            data: { statusId: input.soldStatusId },
          });
        } else if (item.vehicleListingId != null) {
          const result = await tx.vehicleListing.updateMany({
            where: { id: item.vehicleListingId, stockQuantity: { gte: item.quantity } },
            data: { stockQuantity: { decrement: item.quantity } },
          });
          if (result.count === 0) {
            throw new ApiError(409, `"${item.itemNameKa}" — აღარ არის ხელმისაწვდომი`);
          }
          await tx.vehicleListing.updateMany({
            where: { id: item.vehicleListingId, stockQuantity: { lte: 0 } },
            data: { statusId: input.soldStatusId },
          });
        }
      }

      const { items, soldStatusId: _soldStatusId, ...orderData } = input;
      const order = await tx.order.create({ data: orderData });
      await tx.orderItem.createMany({
        data: items.map((item) => ({ ...item, orderId: order.id })),
      });
      await tx.cartItem.deleteMany({ where: { userId: input.userId } });

      return tx.order.findUniqueOrThrow({ where: { id: order.id }, include: orderItemsInclude });
    });
  },
};
