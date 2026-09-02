import { ApiError } from "../../lib/ApiError.js";
import { prisma } from "../../config/prisma.js";
import { startOfDayTbilisi, endOfDayTbilisi } from "../../lib/tbilisi-dates.js";
import type {
  CartItemType,
  OrderDeliverySpeed,
  OrderFulfillmentMethod,
  Prisma,
} from "../../generated/prisma/index.js";

// createdAt included for fraud.service.ts's NEW_ACCOUNT_HIGH_VALUE check
// (account age at order time) — harmless to also carry on the admin views
// that reuse this select.
const buyerSelect = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  createdAt: true,
} as const;

// Also used by the admin single-order detail lookup (see orders.service.ts's
// getAnyOrder) — the customer-facing toOrderResponse simply never reads
// `order.user`, so including it here is harmless for that path.
const orderItemsInclude = {
  items: { orderBy: { id: "asc" } },
  status: true,
  bank: true,
  cancellationReason: true,
  user: { select: buyerSelect },
  riskFlags: { orderBy: { createdAt: "desc" } },
} as const;

// Advisory-lock namespace for the promo-code usage-limit recheck below —
// paired with a promo code's own id as the second key, so locking one code
// never blocks checkouts using a different one (or no code at all). Same
// technique as fina-sync.service.ts's FINA_SYNC_LOCK_KEY, arbitrary/unique
// to this lock's purpose.
const PROMO_CODE_LOCK_NAMESPACE = 604710823;

function buildAdminWhere(filters: {
  search?: string;
  statusIds?: number[];
  fulfillmentMethods?: OrderFulfillmentMethod[];
  createdFrom?: string;
  createdTo?: string;
  flaggedOnly?: boolean;
}): Prisma.OrderWhereInput | undefined {
  const and: Prisma.OrderWhereInput[] = [];

  if (filters.flaggedOnly) {
    and.push({ riskFlags: { some: {} } });
  }

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
        ...(filters.createdFrom ? { gte: startOfDayTbilisi(filters.createdFrom) } : {}),
        ...(filters.createdTo ? { lte: endOfDayTbilisi(filters.createdTo) } : {}),
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

export type StockAdjustmentItem = {
  productVariantId: number | null;
  vehicleListingId: number | null;
  quantity: number;
  itemNameKa: string;
};

export type PlaceOrderInput = {
  orderCode: string;
  idempotencyKey: string;
  userId: number;
  fulfillmentMethod: OrderFulfillmentMethod;
  statusId: number;
  addressId?: number | null;
  shippingSnapshot?: Prisma.InputJsonValue;
  bankId?: number | null;
  promoCodeId?: number | null;
  promoCodeSnapshot?: string | null;
  promoDiscountPercent?: number | null;
  subtotal: number;
  discountTotal: number;
  deliverySpeed?: OrderDeliverySpeed | null;
  deliveryCost: number;
  deliveryTimeSnapshot?: string | null;
  total: number;
  ipAddress?: string | null;
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

  // Idempotency-key lookup — see orders.service.ts's placeOrder, which
  // returns this instead of creating a second order on a retried request.
  findByIdempotencyKey(idempotencyKey: string) {
    return prisma.order.findUnique({ where: { idempotencyKey }, include: orderItemsInclude });
  },

  // `stockAdjustment` mirrors placeOrder's own decrement logic below, in
  // whichever direction the transition needs (see orders.service.ts's
  // updateOrderStatus): RESTORE gives stock back when an order newly becomes
  // CANCELLED; DECREMENT takes it away again if an admin moves a CANCELLED
  // order to any other status (the symmetric case — without it, toggling an
  // order's status back and forth would inflate stock for free). Everything
  // runs in one transaction so the status change and the stock move commit
  // or roll back together.
  //
  // `expectedCurrentStatusId` guards against two concurrent calls (double
  // click, two admins) both reading the same pre-transition status and both
  // applying `stockAdjustment` — the status update below is a compare-and-
  // swap on statusId, same technique as the stock updates' `stockQuantity:
  // { gte }` guard. Whichever request loses the race sees `count === 0` and
  // throws, instead of silently double-restoring/double-decrementing stock.
  async updateStatus(
    id: number,
    statusId: number,
    cancellation: { cancellationReasonId: number | null; cancellationNote: string | null },
    stockAdjustment: {
      direction: "RESTORE" | "DECREMENT";
      items: StockAdjustmentItem[];
      soldStatusId: number;
      availableStatusId: number;
    } | undefined,
    expectedCurrentStatusId: number,
  ) {
    await prisma.$transaction(async (tx) => {
      const result = await tx.order.updateMany({
        where: { id, statusId: expectedCurrentStatusId },
        data: { statusId, ...cancellation },
      });
      if (result.count === 0) {
        throw new ApiError(
          409,
          "შეკვეთის სტატუსი უკვე შეიცვალა სხვა მოქმედებით — გვერდი განაახლეთ და სცადეთ თავიდან",
        );
      }

      if (!stockAdjustment) return;

      for (const item of stockAdjustment.items) {
        if (stockAdjustment.direction === "RESTORE") {
          if (item.productVariantId != null) {
            await tx.productVariant.update({
              where: { id: item.productVariantId },
              data: { stockQuantity: { increment: item.quantity } },
            });
            // Only undoes the specific SOLD auto-flip placeOrder made — never
            // overwrites a status an admin set independently (e.g. RESERVED).
            await tx.productVariant.updateMany({
              where: {
                id: item.productVariantId,
                statusId: stockAdjustment.soldStatusId,
                stockQuantity: { gt: 0 },
              },
              data: { statusId: stockAdjustment.availableStatusId },
            });
          } else if (item.vehicleListingId != null) {
            await tx.vehicleListing.update({
              where: { id: item.vehicleListingId },
              data: { stockQuantity: { increment: item.quantity } },
            });
            await tx.vehicleListing.updateMany({
              where: {
                id: item.vehicleListingId,
                statusId: stockAdjustment.soldStatusId,
                stockQuantity: { gt: 0 },
              },
              data: { statusId: stockAdjustment.availableStatusId },
            });
          }
        } else {
          if (item.productVariantId != null) {
            const result = await tx.productVariant.updateMany({
              where: { id: item.productVariantId, stockQuantity: { gte: item.quantity } },
              data: { stockQuantity: { decrement: item.quantity } },
            });
            if (result.count === 0) {
              throw new ApiError(
                409,
                `"${item.itemNameKa}" — მარაგში საკმარისი რაოდენობა აღარ არის, გაუქმების დაბრუნება ვერ მოხერხდება`,
              );
            }
            await tx.productVariant.updateMany({
              where: { id: item.productVariantId, stockQuantity: { lte: 0 } },
              data: { statusId: stockAdjustment.soldStatusId },
            });
          } else if (item.vehicleListingId != null) {
            const result = await tx.vehicleListing.updateMany({
              where: { id: item.vehicleListingId, stockQuantity: { gte: item.quantity } },
              data: { stockQuantity: { decrement: item.quantity } },
            });
            if (result.count === 0) {
              throw new ApiError(
                409,
                `"${item.itemNameKa}" — აღარ არის ხელმისაწვდომი, გაუქმების დაბრუნება ვერ მოხერხდება`,
              );
            }
            await tx.vehicleListing.updateMany({
              where: { id: item.vehicleListingId, stockQuantity: { lte: 0 } },
              data: { statusId: stockAdjustment.soldStatusId },
            });
          }
        }
      }
    });

    return prisma.order.findUniqueOrThrow({ where: { id }, include: orderItemsInclude });
  },

  // Admin-only: every user's orders, not scoped to a single owner. Real
  // server-side pagination (skip/take), same pattern as
  // error-logs.repository.ts's list() — the order table has no natural cap
  // the way most other admin list endpoints' data does, so it can grow far
  // larger than those (which still fetch everything and paginate
  // client-side via usePagination on the frontend).
  findManyAdmin(
    filters: {
      search?: string;
      statusIds?: number[];
      fulfillmentMethods?: OrderFulfillmentMethod[];
      createdFrom?: string;
      createdTo?: string;
      flaggedOnly?: boolean;
    },
    skip: number,
    take: number,
  ) {
    return prisma.order.findMany({
      where: buildAdminWhere(filters),
      include: {
        items: { select: { quantity: true } },
        status: true,
        user: { select: buyerSelect },
        _count: { select: { riskFlags: true } },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take,
    });
  },

  // Sibling to findManyAdmin above — reuses the same buildAdminWhere so the
  // two never drift on what counts as "matching the current filters".
  count(filters: {
    search?: string;
    statusIds?: number[];
    fulfillmentMethods?: OrderFulfillmentMethod[];
    createdFrom?: string;
    createdTo?: string;
    flaggedOnly?: boolean;
  }) {
    return prisma.order.count({ where: buildAdminWhere(filters) });
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
      // Re-checks the promo code's usage-limit/per-user-reuse rules against
      // the DB's current state, inside this same transaction — the
      // resolvePromoCodeForItems check the caller already did (see
      // orders.service.ts's computeCheckoutTotals) ran well before this
      // transaction even opened, so on its own it's a classic TOCTOU race:
      // two concurrent checkouts near a promo's usage cap could both pass
      // that earlier check and both redeem it. A blocking advisory lock,
      // scoped to this one promo code, forces a second concurrent checkout
      // using the same code to wait for the first to commit (or roll back)
      // before it re-counts — so the recount below always sees the other
      // transaction's result, not a stale pre-commit snapshot.
      if (input.promoCodeId != null) {
        // $executeRaw, not $queryRaw — pg_advisory_xact_lock (the blocking
        // variant, unlike fina-sync.service.ts's pg_try_advisory_xact_lock)
        // returns void, which the query engine can't deserialize as a
        // result column; $executeRaw doesn't attempt to.
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(${PROMO_CODE_LOCK_NAMESPACE}, ${input.promoCodeId})`;

        const promo = await tx.promoCode.findUnique({
          where: { id: input.promoCodeId },
          select: { usageLimit: true },
        });
        if (!promo) {
          throw new ApiError(400, "პრომო კოდი ვეღარ მოიძებნა");
        }

        // Excludes CANCELLED orders — same reasoning as promo-codes.repository.ts's
        // countUsage/hasUserUsed, which this re-check must stay consistent with.
        const alreadyUsedByUser = await tx.order.count({
          where: {
            promoCodeId: input.promoCodeId,
            userId: input.userId,
            status: { key: { not: "CANCELLED" } },
          },
        });
        if (alreadyUsedByUser > 0) {
          throw new ApiError(400, "თქვენ უკვე გამოიყენეთ ეს პრომო კოდი");
        }

        if (promo.usageLimit != null) {
          const usageCount = await tx.order.count({
            where: { promoCodeId: input.promoCodeId, status: { key: { not: "CANCELLED" } } },
          });
          if (usageCount >= promo.usageLimit) {
            throw new ApiError(400, "პრომო კოდის გამოყენების ლიმიტი ამოწურულია");
          }
        }
      }

      for (const item of input.items) {
        if (item.productVariantId != null) {
          // isActive: true guards against a variant deactivated in the
          // narrow race window between computeCheckoutTotals's read and
          // this transaction — same TOCTOU reasoning as the stockQuantity
          // condition it's alongside.
          const result = await tx.productVariant.updateMany({
            where: { id: item.productVariantId, isActive: true, stockQuantity: { gte: item.quantity } },
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
          // Same isActive guard as the productVariant branch above.
          const result = await tx.vehicleListing.updateMany({
            where: { id: item.vehicleListingId, isActive: true, stockQuantity: { gte: item.quantity } },
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
