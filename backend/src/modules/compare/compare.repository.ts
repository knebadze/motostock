import { prisma } from "../../config/prisma.js";
import { productSummaryInclude } from "../products/products.repository.js";
import { vehicleListingInclude } from "../vehicle-listing/vehicle-listing.repository.js";
import type { CompareItemType } from "../../generated/prisma/index.js";

export type CompareOwner = { userId: number } | { guestId: string };

function ownerWhere(owner: CompareOwner) {
  return "userId" in owner ? { userId: owner.userId } : { guestId: owner.guestId };
}

export const compareItemInclude = {
  product: { include: productSummaryInclude },
  vehicleListing: { include: vehicleListingInclude },
} as const;

export const compareRepository = {
  findByOwner(owner: CompareOwner) {
    return prisma.compareItem.findMany({
      where: ownerWhere(owner),
      include: compareItemInclude,
      orderBy: { createdAt: "desc" },
    });
  },

  countByOwner(owner: CompareOwner) {
    return prisma.compareItem.count({ where: ownerWhere(owner) });
  },

  findById(id: number) {
    return prisma.compareItem.findUnique({ where: { id }, include: compareItemInclude });
  },

  findByOwnerAndProduct(owner: CompareOwner, productId: number) {
    return prisma.compareItem.findFirst({ where: { ...ownerWhere(owner), productId } });
  },

  findByOwnerAndVehicleListing(owner: CompareOwner, vehicleListingId: number) {
    return prisma.compareItem.findFirst({ where: { ...ownerWhere(owner), vehicleListingId } });
  },

  findStatus(owner: CompareOwner, productIds: number[], vehicleListingIds: number[]) {
    return prisma.compareItem.findMany({
      where: {
        ...ownerWhere(owner),
        OR: [{ productId: { in: productIds } }, { vehicleListingId: { in: vehicleListingIds } }],
      },
      select: { id: true, productId: true, vehicleListingId: true },
    });
  },

  create(data: {
    itemType: CompareItemType;
    userId?: number | null;
    guestId?: string | null;
    productId?: number | null;
    vehicleListingId?: number | null;
  }) {
    return prisma.compareItem.create({ data, include: compareItemInclude });
  },

  delete(id: number) {
    return prisma.compareItem.delete({ where: { id } });
  },

  // Merge-on-login support (see compare.service.ts mergeGuestCompareIntoUser).
  findByGuestId(guestId: string) {
    return prisma.compareItem.findMany({ where: { guestId } });
  },

  reassignToUser(id: number, userId: number) {
    return prisma.compareItem.update({ where: { id }, data: { userId, guestId: null } });
  },
};
