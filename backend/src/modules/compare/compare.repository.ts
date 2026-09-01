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

  // Atomically folds one guest compare row into `userId`'s compare list —
  // same claim-then-insert reasoning as wishlist.repository.ts's
  // mergeGuestItem (see there for the full explanation). `deleteMany`
  // claims the guest row so a concurrent merge of the same guest cookie
  // can't double-process it or crash on an already-deleted one;
  // `createMany` with `skipDuplicates` (native ON CONFLICT DO NOTHING)
  // drops it if the user already has the same item, atomically.
  async mergeGuestItem(
    item: {
      id: number;
      itemType: CompareItemType;
      productId: number | null;
      vehicleListingId: number | null;
    },
    guestId: string,
    userId: number,
  ) {
    await prisma.$transaction(async (tx) => {
      const claimed = await tx.compareItem.deleteMany({ where: { id: item.id, guestId } });
      if (claimed.count === 0) return;

      await tx.compareItem.createMany({
        data: [
          {
            itemType: item.itemType,
            userId,
            productId: item.productId,
            vehicleListingId: item.vehicleListingId,
          },
        ],
        skipDuplicates: true,
      });
    });
  },
};
