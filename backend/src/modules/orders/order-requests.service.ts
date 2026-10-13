import { ApiError } from "../../lib/ApiError.js";
import { logger } from "../../lib/logger.js";
import { isUniqueConstraintViolation } from "../../lib/prismaErrors.js";
import { sendEmailTemplate } from "../email-templates/email-templates.service.js";
import { getAdminNotificationEmail, getReturnPeriodDays } from "../settings/settings.service.js";
import { ordersRepository } from "./orders.repository.js";
import { orderRequestsRepository } from "./order-requests.repository.js";
import { toOrderResponse } from "./orders.service.js";
import type { CreateOrderRequestInput, ListOrderRequestsQuery } from "./orders.schema.js";

// Customer "please cancel" / "I want to return" requests. Deliberately only
// a message to the shop — nothing about the order, its stock or FINA changes
// here. The admin is emailed (Settings → admin notification address) and
// sees the request in the admin panel's requests inbox/bell; they call the
// customer, then cancel the order (which auto-resolves an open CANCEL
// request — see orders.repository.ts's updateStatus) or handle the return
// by hand and mark the request resolved.

// Before it's handed to the courier — later than that, it's a return.
const CANCELLABLE_STATUS_KEYS = new Set(["PENDING", "CONFIRMED"]);
const RETURNABLE_STATUS_KEY = "DELIVERED";
const MS_PER_DAY = 24 * 60 * 60 * 1000;

const REQUEST_TYPE_LABEL_KA = { CANCEL: "გაუქმება", RETURN: "დაბრუნება" } as const;

const ALREADY_OPEN_MESSAGE = "ასეთი მოთხოვნა უკვე გაგზავნილია — მაღაზია მალე დაგიკავშირდებათ";

export async function createOrderRequest(userId: number, orderId: number, input: CreateOrderRequestInput) {
  const order = await ordersRepository.findById(orderId);
  if (!order || order.userId !== userId) {
    throw new ApiError(404, "შეკვეთა ვერ მოიძებნა", "ORDER_NOT_FOUND");
  }

  if (input.type === "CANCEL" && !CANCELLABLE_STATUS_KEYS.has(order.status.key)) {
    throw new ApiError(
      400,
      "ამ ეტაპზე შეკვეთის გაუქმების მოთხოვნა შეუძლებელია",
      "ORDER_CANCEL_REQUEST_NOT_ALLOWED",
    );
  }
  if (input.type === "RETURN") {
    if (order.status.key !== RETURNABLE_STATUS_KEY) {
      throw new ApiError(
        400,
        "დაბრუნების მოთხოვნა მხოლოდ ჩაბარებულ შეკვეთაზეა შესაძლებელი",
        "ORDER_RETURN_REQUEST_NOT_ALLOWED",
      );
    }
    // 0 = no window configured (the line is hidden on the storefront) —
    // the shop decides case by case.
    const returnPeriodDays = await getReturnPeriodDays();
    if (returnPeriodDays > 0) {
      const deliveredAt =
        [...order.statusHistory].reverse().find((entry) => entry.status.key === RETURNABLE_STATUS_KEY)
          ?.createdAt ??
        order.updatedAt;
      if (Date.now() - deliveredAt.getTime() > returnPeriodDays * MS_PER_DAY) {
        throw new ApiError(400, "დაბრუნების ვადა ამოიწურა", "ORDER_RETURN_PERIOD_EXPIRED", {
          days: returnPeriodDays,
        });
      }
    }
  }

  if (order.requests.some((request) => request.type === input.type && request.status === "OPEN")) {
    throw new ApiError(409, ALREADY_OPEN_MESSAGE, "ORDER_REQUEST_ALREADY_OPEN");
  }

  const reason = input.reason?.trim() || null;
  try {
    await orderRequestsRepository.create({ orderId: order.id, type: input.type, reason });
  } catch (error) {
    // Double submit racing past the check above — the partial unique index
    // (one OPEN request per order+type) catches it.
    if (isUniqueConstraintViolation(error, "open_order_type")) {
      throw new ApiError(409, ALREADY_OPEN_MESSAGE, "ORDER_REQUEST_ALREADY_OPEN");
    }
    throw error;
  }

  // Best-effort, detached — same as placeOrder's NEW_ORDER_ADMIN email.
  void getAdminNotificationEmail()
    .then((adminNotificationEmail) => {
      if (!adminNotificationEmail) return;
      return sendEmailTemplate("ORDER_REQUEST_ADMIN", adminNotificationEmail, {
        customerName: `${order.user.firstName} ${order.user.lastName}`.trim(),
        orderCode: order.orderCode,
        total: Number(order.total).toFixed(2),
        requestType: REQUEST_TYPE_LABEL_KA[input.type],
        reason: reason ?? "—",
      });
    })
    .catch((err: unknown) => logger.error({ err, orderId: order.id }, "ORDER_REQUEST_ADMIN email failed"));

  const refreshed = await ordersRepository.findById(order.id);
  return toOrderResponse(refreshed!);
}

type AdminRequestRow = NonNullable<Awaited<ReturnType<typeof orderRequestsRepository.findByIdForAdmin>>>;

function toAdminOrderRequestResponse(row: AdminRequestRow) {
  return {
    id: row.id,
    type: row.type,
    status: row.status,
    reason: row.reason,
    adminNote: row.adminNote,
    createdAt: row.createdAt,
    resolvedAt: row.resolvedAt,
    order: {
      id: row.order.id,
      orderCode: row.order.orderCode,
      total: Number(row.order.total),
      status: row.order.status,
    },
    buyer: row.order.user,
    resolvedBy: row.resolvedBy,
  };
}

export async function listOrderRequests(query: ListOrderRequestsQuery) {
  const rows = await orderRequestsRepository.findManyForAdmin(query.status);
  return rows.map(toAdminOrderRequestResponse);
}

export function countOpenOrderRequests() {
  return orderRequestsRepository.countOpen();
}

export async function resolveOrderRequest(requestId: number, adminUserId: number, adminNote: string | undefined) {
  const result = await orderRequestsRepository.resolve(requestId, adminUserId, adminNote?.trim() || null);
  if (result.count === 0) {
    const existing = await orderRequestsRepository.findByIdForAdmin(requestId);
    if (!existing) {
      throw new ApiError(404, "მოთხოვნა ვერ მოიძებნა");
    }
    throw new ApiError(409, "მოთხოვნა უკვე დამუშავებულია");
  }
  const row = await orderRequestsRepository.findByIdForAdmin(requestId);
  return toAdminOrderRequestResponse(row!);
}
