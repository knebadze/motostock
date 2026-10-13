import { prisma } from "../../config/prisma.js";
import type { OrderRequestStatus, OrderRequestType } from "../../generated/prisma/index.js";

const adminRequestInclude = {
  order: {
    select: {
      id: true,
      orderCode: true,
      total: true,
      status: true,
      user: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
    },
  },
  resolvedBy: { select: { firstName: true, lastName: true } },
} as const;

// Customer cancel/return requests (see order-requests.service.ts).
export const orderRequestsRepository = {
  create(data: { orderId: number; type: OrderRequestType; reason: string | null }) {
    return prisma.orderRequest.create({ data });
  },

  // Open ones are the admin's to-do list — always all of them; resolved ones
  // are history, capped.
  findManyForAdmin(status: OrderRequestStatus | undefined) {
    return prisma.orderRequest.findMany({
      where: status ? { status } : undefined,
      include: adminRequestInclude,
      orderBy: { createdAt: "desc" },
      take: status === "OPEN" ? undefined : 200,
    });
  },

  findByIdForAdmin(id: number) {
    return prisma.orderRequest.findUnique({ where: { id }, include: adminRequestInclude });
  },

  countOpen() {
    return prisma.orderRequest.count({ where: { status: "OPEN" } });
  },

  // Compare-and-set on status — a second click / second admin gets count 0.
  resolve(id: number, resolvedByUserId: number, adminNote: string | null) {
    return prisma.orderRequest.updateMany({
      where: { id, status: "OPEN" },
      data: { status: "RESOLVED", resolvedAt: new Date(), resolvedByUserId, adminNote },
    });
  },
};
