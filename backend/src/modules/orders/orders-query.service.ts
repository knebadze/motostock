import { ApiError } from "../../lib/ApiError.js";
import { resolvePage } from "../../lib/pagination.js";
import type { CartItemType } from "../../generated/prisma/index.js";
import { cartRepository, type CartOwner } from "../cart/cart.repository.js";
import { addCartItem } from "../cart/cart.service.js";
import { ordersRepository } from "./orders.repository.js";
import { toOrderResponse, computeEstimatedDeliveryDate } from "./orders.service.js";
import type { ListOrdersQuery } from "./orders.schema.js";

// Customer- and admin-facing order READS (list/get/reorder) — split out of
// orders.service.ts (which keeps the checkout/placement flow and the
// mapper/status-resolution helpers this file imports) to keep each file
// under a single responsibility. See orders-admin.service.ts for the
// status-transition/FINA-retry half of the admin surface.

export async function listMyOrders(userId: number) {
  const rows = await ordersRepository.findByUserId(userId);
  return rows.map((row) => ({
    id: row.id,
    orderCode: row.orderCode,
    status: row.status,
    total: Number(row.total),
    itemCount: row.items.reduce((sum, item) => sum + item.quantity, 0),
    createdAt: row.createdAt,
    estimatedDeliveryDate: computeEstimatedDeliveryDate(
      row.createdAt,
      row.deliverySpeed,
      row.deliveryTimeSnapshot,
    ),
  }));
}

export async function getMyOrder(userId: number, id: number) {
  const row = await ordersRepository.findById(id);
  if (!row || row.userId !== userId) {
    throw new ApiError(404, "შეკვეთა ვერ მოიძებნა", "ORDER_NOT_FOUND");
  }
  return toOrderResponse(row);
}

// Recovers how much of *this* reorder request actually landed in the cart —
// addCartItem's own return value is the item's resulting total quantity,
// which already includes whatever was in the cart before this call (e.g.
// the shopper already had 1 in their cart and this call asked for 2 more:
// addCartItem returns 3, not the 2 this call contributed). Comparing
// against the pre-call quantity isolates just this call's contribution,
// which is what the per-item ADDED/PARTIAL/UNAVAILABLE status below needs.
async function reorderAddedQuantity(
  owner: CartOwner,
  input: {
    itemType: CartItemType;
    productVariantId: number | null;
    vehicleListingId: number | null;
    quantity: number;
  },
): Promise<number> {
  const existing =
    input.productVariantId != null
      ? await cartRepository.findByOwnerAndProductVariant(owner, input.productVariantId)
      : input.vehicleListingId != null
        ? await cartRepository.findByOwnerAndVehicleListing(owner, input.vehicleListingId)
        : null;
  const beforeQuantity = existing?.quantity ?? 0;

  try {
    const result = await addCartItem(owner, {
      itemType: input.itemType,
      productVariantId: input.productVariantId,
      vehicleListingId: input.vehicleListingId,
      quantity: input.quantity,
    });
    return result.quantity - beforeQuantity;
  } catch {
    // addCartItem throws when the variant/listing no longer exists or has
    // zero stock left — either way, this item just isn't reorderable.
    return 0;
  }
}

// "Buy again" from a past order — re-adds each line item to the caller's
// own cart (never a guest cart; order history is login-only). Deliberately
// per-item best-effort rather than all-or-nothing: an item whose product
// was deleted or has sold out doesn't block the rest of the order from
// being re-added, it's just reported as UNAVAILABLE (or PARTIAL if only
// some of the requested quantity is still in stock). Reuses addCartItem for
// the actual stock/existence validation and quantity capping instead of
// duplicating that logic here.
export async function reorderOrder(userId: number, id: number) {
  const order = await ordersRepository.findById(id);
  if (!order || order.userId !== userId) {
    throw new ApiError(404, "შეკვეთა ვერ მოიძებნა", "ORDER_NOT_FOUND");
  }

  const owner: CartOwner = { userId };
  const items: {
    itemName: { ka: string; en: string; ru: string };
    requestedQuantity: number;
    addedQuantity: number;
    status: "ADDED" | "PARTIAL" | "UNAVAILABLE";
  }[] = [];

  // Sequential, not Promise.all — each iteration mutates the same cart, so
  // running them concurrently would race on "does a row for this item
  // already exist" the same way BuyTogether's frontend add-all already
  // avoids for the same reason.
  for (const item of order.items) {
    const itemName = { ka: item.itemNameKa, en: item.itemNameEn, ru: item.itemNameRu };

    if (item.productVariantId == null && item.vehicleListingId == null) {
      // The source product/vehicle listing was deleted after this order was
      // placed (OrderItem's FKs are SetNull-on-delete) — nothing to re-add.
      items.push({ itemName, requestedQuantity: item.quantity, addedQuantity: 0, status: "UNAVAILABLE" });
      continue;
    }

    const addedQuantity = await reorderAddedQuantity(owner, {
      itemType: item.itemType,
      productVariantId: item.productVariantId,
      vehicleListingId: item.vehicleListingId,
      quantity: item.quantity,
    });

    const status =
      addedQuantity <= 0 ? "UNAVAILABLE" : addedQuantity < item.quantity ? "PARTIAL" : "ADDED";

    items.push({
      itemName,
      requestedQuantity: item.quantity,
      addedQuantity: Math.max(addedQuantity, 0),
      status,
    });
  }

  return { items };
}

// Admin-only from here down — every caller of these is already gated by
// requireRole(ROLES.ADMIN) in orders.routes.ts, so unlike listMyOrders/
// getMyOrder above these never scope by owner.

// Real server-side pagination (skip/take), same pattern as error-logs.
// Default pageSize (20) matches the client-side page size everyone is used
// to — see frontend's shared Pagination.tsx's DEFAULT_PAGE_SIZE.
export async function listAllOrders(filters: ListOrdersQuery) {
  const { page, pageSize, skip, take } = resolvePage(filters);

  const [rows, total] = await Promise.all([
    ordersRepository.findManyAdmin(filters, skip, take),
    ordersRepository.count(filters),
  ]);

  const orders = rows.map((row) => ({
    id: row.id,
    orderCode: row.orderCode,
    status: row.status,
    fulfillmentMethod: row.fulfillmentMethod,
    total: Number(row.total),
    itemCount: row.items.reduce((sum, item) => sum + item.quantity, 0),
    createdAt: row.createdAt,
    buyer: row.user,
    hasRiskFlags: row._count.riskFlags > 0,
    finaSyncStatus: row.finaSyncStatus,
    estimatedDeliveryDate: computeEstimatedDeliveryDate(
      row.createdAt,
      row.deliverySpeed,
      row.deliveryTimeSnapshot,
    ),
  }));

  return { orders, total, page, pageSize };
}

export async function getAnyOrder(id: number) {
  const row = await ordersRepository.findById(id);
  if (!row) {
    throw new ApiError(404, "შეკვეთა ვერ მოიძებნა");
  }
  // riskFlags is only ever surfaced here (admin) — toOrderResponse itself is
  // shared with the customer-facing getMyOrder, which must never see them.
  return {
    ...toOrderResponse(row),
    buyer: row.user,
    riskFlags: row.riskFlags.map((flag) => ({
      type: flag.type,
      detail: flag.detail,
      createdAt: flag.createdAt,
    })),
    finaSyncStatus: row.finaSyncStatus,
    finaOutOperationId: row.finaOutOperationId,
  };
}
