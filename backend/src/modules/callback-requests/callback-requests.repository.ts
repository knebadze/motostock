import { prisma } from "../../config/prisma.js";
import type { CallbackRequestStatus } from "../../generated/prisma/index.js";

const adminInclude = {
  vehicleListing: { select: { id: true } },
  resolvedBy: { select: { firstName: true, lastName: true } },
} as const;

export const callbackRequestsRepository = {
  // Only an active listing can be asked about.
  findListingForRequest(id: number) {
    return prisma.vehicleListing.findFirst({
      where: { id, isActive: true },
      select: {
        id: true,
        year: true,
        vehicleCatalog: { select: { variant: true, brand: { select: { name: true } }, model: { select: { name: true } } } },
      },
    });
  },

  create(data: {
    vehicleListingId: number;
    itemTitle: string;
    name: string;
    phone: string;
    preferredTime: string | null;
    note: string | null;
  }) {
    return prisma.callbackRequest.create({ data });
  },

  findManyForAdmin(status: CallbackRequestStatus | undefined) {
    return prisma.callbackRequest.findMany({
      where: status ? { status } : undefined,
      include: adminInclude,
      orderBy: { createdAt: "desc" },
      take: status === "OPEN" ? undefined : 200,
    });
  },

  findByIdForAdmin(id: number) {
    return prisma.callbackRequest.findUnique({ where: { id }, include: adminInclude });
  },

  countOpen() {
    return prisma.callbackRequest.count({ where: { status: "OPEN" } });
  },

  // Compare-and-set, same as order requests.
  resolve(id: number, resolvedByUserId: number, adminNote: string | null) {
    return prisma.callbackRequest.updateMany({
      where: { id, status: "OPEN" },
      data: { status: "RESOLVED", resolvedAt: new Date(), resolvedByUserId, adminNote },
    });
  },
};
