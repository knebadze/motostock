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

  // Atomically folds one guest wishlist row into `userId`'s wishlist.
  // `deleteMany` "claims" the guest row — only deletes (count 1) if it's
  // still there with this exact id+guestId — so a concurrent merge of the
  // same guest cookie (double-tab login) that already claimed it sees
  // count 0 and no-ops, instead of both callers racing to reassign/delete
  // the same row or one crashing on an already-deleted one (P2025).
  // `createMany` with `skipDuplicates` is Postgres's native
  // INSERT ... ON CONFLICT DO NOTHING — matches the existing "a guest item
  // duplicating something the user already has is just dropped" behavior,
  // atomically even against a *different* concurrent write (e.g. the user
  // wishlisting the same item from another tab). One transaction so a crash
  // between the claim and the insert can't silently drop the item.
  async mergeGuestItem(
    item: {
      id: number;
      itemType: WishlistItemType;
      productId: number | null;
      vehicleListingId: number | null;
    },
    guestId: string,
    userId: number,
  ) {
    await prisma.$transaction(async (tx) => {
      const claimed = await tx.wishlistItem.deleteMany({ where: { id: item.id, guestId } });
      if (claimed.count === 0) return;

      await tx.wishlistItem.createMany({
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
