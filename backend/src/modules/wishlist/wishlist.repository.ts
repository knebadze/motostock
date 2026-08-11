import { prisma } from "../../config/prisma.js";
import { productSummaryInclude } from "../products/products.repository.js";
import { vehicleListingInclude } from "../vehicle-listing/vehicle-listing.repository.js";
import type { WishlistItemType } from "../../generated/prisma/index.js";

export type WishlistOwner = { userId: number } | { guestId: string };

function ownerWhere(owner: WishlistOwner) {
  return "userId" in owner ? { userId: owner.userId } : { guestId: owner.guestId };
}

// Exported so users.repository.ts's admin "full detail" view can nest the
// same shape under User.wishlistItems without duplicating it.
export const wishlistItemInclude = {
  product: { include: productSummaryInclude },
  vehicleListing: { include: vehicleListingInclude },
} as const;

export const wishlistRepository = {
  findByOwner(owner: WishlistOwner) {
    return prisma.wishlistItem.findMany({
      where: ownerWhere(owner),
      include: wishlistItemInclude,
      orderBy: { createdAt: "desc" },
    });
  },

  countByOwner(owner: WishlistOwner) {
    return prisma.wishlistItem.count({ where: ownerWhere(owner) });
  },

  findById(id: number) {
    return prisma.wishlistItem.findUnique({ where: { id }, include: wishlistItemInclude });
  },

  findByOwnerAndProduct(owner: WishlistOwner, productId: number) {
    return prisma.wishlistItem.findFirst({ where: { ...ownerWhere(owner), productId } });
  },

  findByOwnerAndVehicleListing(owner: WishlistOwner, vehicleListingId: number) {
    return prisma.wishlistItem.findFirst({ where: { ...ownerWhere(owner), vehicleListingId } });
  },

  findStatus(owner: WishlistOwner, productIds: number[], vehicleListingIds: number[]) {
    return prisma.wishlistItem.findMany({
      where: {
        ...ownerWhere(owner),
        OR: [{ productId: { in: productIds } }, { vehicleListingId: { in: vehicleListingIds } }],
      },
      select: { id: true, productId: true, vehicleListingId: true },
    });
  },

  create(data: {
    itemType: WishlistItemType;
    userId?: number | null;
    guestId?: string | null;
    productId?: number | null;
    vehicleListingId?: number | null;
  }) {
    return prisma.wishlistItem.create({ data, include: wishlistItemInclude });
  },

  delete(id: number) {
    return prisma.wishlistItem.delete({ where: { id } });
  },

  // Merge-on-login support (see wishlist.service.ts mergeGuestWishlistIntoUser).
  findByGuestId(guestId: string) {
    return prisma.wishlistItem.findMany({ where: { guestId } });
  },

  reassignToUser(id: number, userId: number) {
    return prisma.wishlistItem.update({ where: { id }, data: { userId, guestId: null } });
  },
};
