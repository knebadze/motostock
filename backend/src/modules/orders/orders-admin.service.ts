import { ApiError } from "../../lib/ApiError.js";
import type { EmailTemplateKey } from "../../generated/prisma/index.js";
import { lookupsRepository } from "../lookups/lookups.repository.js";
import { getLookupDelegate } from "../lookups/lookups.registry.js";
import { orderStatusesRepository } from "../order-statuses/order-statuses.repository.js";
import { pushOrderReturn, retryOrderFinaPush } from "../fina-sync/fina-sync.service.js";
import { sendEmailTemplate } from "../email-templates/email-templates.service.js";
import { ordersRepository } from "./orders.repository.js";
import {
  toOrderResponse,
  resolveSoldStatusId,
  resolveAvailableStatusId,
  resolveInitialOrderStatusId,
} from "./orders.service.js";
import { getAnyOrder } from "./orders-query.service.js";

// Status-transition/FINA-retry half of the admin order surface — split out
// of orders.service.ts (which keeps the checkout/placement flow and the
// mapper/status-resolution helpers this file imports). See
// orders-query.service.ts for the list/get/reorder half.

type OrderRow = NonNullable<Awaited<ReturnType<typeof ordersRepository.findById>>>;

// Only the statuses a customer would actually want a notification about —
// PENDING (the starting status, already covered by the ORDER_PLACED email)
// and any custom status an admin later adds via General Classifiers simply
// don't send anything.
const STATUS_KEY_TO_EMAIL_TEMPLATE: Partial<Record<string, EmailTemplateKey>> = {
  CONFIRMED: "ORDER_CONFIRMED",
  SHIPPED: "ORDER_SHIPPED",
  DELIVERED: "ORDER_DELIVERED",
  CANCELLED: "ORDER_CANCELLED",
};

function toOrderStatusUpdateResponse(order: OrderRow) {
  return {
    ...toOrderResponse(order),
    buyer: order.user,
    riskFlags: order.riskFlags.map((flag) => ({
      type: flag.type,
      detail: flag.detail,
      createdAt: flag.createdAt,
    })),
    cancellationReason: order.cancellationReason
      ? {
          id: order.cancellationReason.id,
          key: order.cancellationReason.key,
          nameKa: order.cancellationReason.nameKa,
          nameEn: order.cancellationReason.nameEn,
          nameRu: order.cancellationReason.nameRu,
        }
      : null,
    cancellationNote: order.cancellationNote,
    finaSyncStatus: order.finaSyncStatus,
    finaOutOperationId: order.finaOutOperationId,
  };
}

export async function updateOrderStatus(
  id: number,
  statusId: number,
  cancellationReasonId?: number,
  cancellationNote?: string,
) {
  const status = await orderStatusesRepository.findById(statusId);
  if (!status) {
    throw new ApiError(400, "მითითებული სტატუსი არ არსებობს");
  }

  const isCancelling = status.key === "CANCELLED";
  if (isCancelling && cancellationReasonId == null) {
    throw new ApiError(400, "შეკვეთის გაუქმებისას მიზეზის მითითება საჭიროა");
  }
  if (isCancelling) {
    const reason = await lookupsRepository.findById(
      getLookupDelegate("cancellation-reasons"),
      cancellationReasonId!,
    );
    if (!reason) {
      throw new ApiError(400, "მითითებული მიზეზი ვერ მოიძებნა");
    }
  }

  const existing = await ordersRepository.findById(id);
  if (!existing) {
    throw new ApiError(404, "შეკვეთა ვერ მოიძებნა");
  }

  // CANCELLED is a terminal state — un-cancelling used to be allowed (moving
  // a CANCELLED order to any other status, re-decrementing the stock this
  // same function had just restored), but that path never re-synced the
  // reversal to FINA: pushOrderReturn had already set finaSyncStatus to
  // SYNCED when the order was cancelled, un-cancelling never pushed a fresh
  // sale, and the manual "retry FINA sync" button now refuses to touch an
  // already-SYNCED order — so an un-cancelled order's FINA record was
  // permanently stuck showing it as returned/inactive with no way to fix it
  // short of direct DB access. Simplest correct fix: cancellation is
  // final. A customer who wants the same order again uses reorderOrder
  // (POST /orders/me/:id/reorder) to place a genuinely new order instead.
  if (existing.status.key === "CANCELLED") {
    throw new ApiError(
      400,
      "გაუქმებული შეკვეთის სტატუსის შეცვლა შეუძლებელია — მომხმარებელს შეუძლია იგივე შეკვეთა თავიდან გააკეთოს",
      "ORDER_ALREADY_CANCELLED",
    );
  }

  // Re-submitting the status the order is already at is a no-op. Without
  // this, it isn't actually harmless: updateStatus's compare-and-swap below
  // guards against a *concurrent* change landing between two calls, but it
  // can't catch this case at all — expectedCurrentStatusId is `existing`'s
  // own statusId, freshly read a few lines above, so when the caller asks to
  // "change" it to that same value the CAS trivially matches itself. Two
  // admin tabs open on the same order (second tab still shows the pre-change
  // status and independently submits the status it thinks is "new"), or a
  // plain client retry of this non-idempotent endpoint, would otherwise fall
  // through to the unconditional email send below and re-notify the customer
  // (e.g. a second "your order has shipped" email).
  if (existing.statusId === statusId) {
    return toOrderStatusUpdateResponse(existing);
  }

  // Cancelling restores the stock placeOrder originally decremented. No
  // other transition (e.g. CONFIRMED -> SHIPPED) ever touches stock.
  let stockAdjustment: Parameters<typeof ordersRepository.updateStatus>[3];
  if (isCancelling) {
    const [soldStatusId, availableStatusId] = await Promise.all([
      resolveSoldStatusId(),
      resolveAvailableStatusId(),
    ]);
    stockAdjustment = {
      direction: "RESTORE",
      items: existing.items.map((item) => ({
        productVariantId: item.productVariantId,
        vehicleListingId: item.vehicleListingId,
        quantity: item.quantity,
        itemNameKa: item.itemNameKa,
      })),
      soldStatusId,
      availableStatusId,
    };
  }

  const order = await ordersRepository.updateStatus(
    id,
    statusId,
    {
      cancellationReasonId: isCancelling ? cancellationReasonId! : null,
      cancellationNote: isCancelling ? (cancellationNote ?? null) : null,
    },
    stockAdjustment,
    existing.statusId,
  );

  // Cancelling (the only stock-adjusting transition now that un-cancelling
  // is disallowed above) mirrors into FINA as a return. Never throws — same
  // best-effort contract as pushOrderSale.
  if (stockAdjustment) {
    await pushOrderReturn({
      id: existing.id,
      orderCode: existing.orderCode,
      finaOutOperationId: existing.finaOutOperationId,
      items: existing.items.map((item) => ({
        productVariantId: item.productVariantId,
        quantity: item.quantity,
        unitPrice: Number(item.unitPrice),
      })),
    });
  }

  const templateKey = STATUS_KEY_TO_EMAIL_TEMPLATE[status.key];
  if (templateKey) {
    await sendEmailTemplate(templateKey, order.user.email, {
      customerName: `${order.user.firstName} ${order.user.lastName}`.trim(),
      orderCode: order.orderCode,
      total: Number(order.total).toFixed(2),
    });
  }

  return toOrderStatusUpdateResponse(order);
}

// Admin-triggered manual retry of pushOrderSale/pushOrderReturn (see
// fina-sync.service.ts's retryOrderFinaPush) — for an order whose
// finaSyncStatus is FAILED. Direction (sale vs. return) is derived from the
// order's current status, not tracked separately, so this always retries
// whatever the automatic paths would have attempted for this order right now.
// retryOrderFinaPush itself refuses (400) a SYNCED order, so a repeat click
// after a prior retry already succeeded can't write a second real FINA
// document.
export async function retryOrderFinaSync(orderId: number) {
  const order = await ordersRepository.findById(orderId);
  if (!order) {
    throw new ApiError(404, "შეკვეთა ვერ მოიძებნა");
  }

  await retryOrderFinaPush({
    id: order.id,
    orderCode: order.orderCode,
    isCancelled: order.status.key === "CANCELLED",
    finaOutOperationId: order.finaOutOperationId,
    finaSyncStatus: order.finaSyncStatus,
    items: order.items.map((item) => ({
      productVariantId: item.productVariantId,
      quantity: item.quantity,
      unitPrice: Number(item.unitPrice),
    })),
  });

  return getAnyOrder(orderId);
}

// Closes the loop left open when computeCheckoutTotals's live FINA check
// couldn't confirm this order at placeOrder time (see
// resolveInitialOrderStatusId in orders.service.ts) and it started life as
// PENDING: called after an admin's on-demand FINA stock re-check (see
// fina-sync.controller.ts's syncOrder) succeeds in reaching FINA for every
// one of this order's linked items. Returns null — a no-op — for any order
// that isn't currently PENDING, so re-checking an already-confirmed order
// never re-fires its ORDER_CONFIRMED email or overwrites a status an admin
// set by hand since.
export async function confirmOrderAfterFinaCheck(orderId: number) {
  const order = await ordersRepository.findById(orderId);
  if (!order || order.status.key !== "PENDING") return null;

  const confirmedStatusId = await resolveInitialOrderStatusId(true);
  return updateOrderStatus(orderId, confirmedStatusId);
}
