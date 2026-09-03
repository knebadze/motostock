import { ApiError } from "../../lib/ApiError.js";
import { prisma } from "../../config/prisma.js";
import { productSummaryInclude } from "../products/products.repository.js";
import { vehicleListingInclude } from "../vehicle-listing/vehicle-listing.repository.js";
import type { CompareItemType } from "../../generated/prisma/index.js";

export type CompareOwner = { userId: number } | { guestId: string };

function ownerWhere(owner: CompareOwner) {
  return "userId" in owner ? { userId: owner.userId } : { guestId: owner.guestId };
}

// Distinguishes a userId from a guestId in the lock key below — without a
// prefix, numeric user id 7 and guest uuid "7" (impossible in practice, but
// the point is not to rely on that) would hash identically and let a guest
// and a logged-in user contend for the same lock.
function ownerLockKey(owner: CompareOwner): string {
  return "userId" in owner ? `user:${owner.userId}` : `guest:${owner.guestId}`;
}

// Arbitrary, unique to this lock's purpose — same technique as
// orders.repository.ts's PROMO_CODE_LOCK_NAMESPACE and fraud.service.ts's
// ACCOUNT_LOCKOUT_LOCK_NAMESPACE.
const COMPARE_LIMIT_LOCK_NAMESPACE = 913847205;

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

  // The count-then-create in compare.service.ts's assertUnderLimit +
  // create() used to run as two independent statements — a classic TOCTOU
  // race, same shape as fraud.service.ts's runWithAccountLockoutGuard: two
  // concurrent "add to compare" requests for the same owner (two tabs, or a
  // rapid double-add) could both read a count just under the limit before
  // either commits its insert, letting both through and landing one item
  // over the configured cap. A blocking advisory lock scoped to this one
  // owner (hashtext of a userId/guestId key) forces a second concurrent
  // call for the *same* owner to wait for the first to commit before it
  // re-counts — different owners never contend with each other.
  async createUnderLimit(
    owner: CompareOwner,
    maxCompareItems: number,
    data: {
      itemType: CompareItemType;
      productId?: number | null;
      vehicleListingId?: number | null;
    },
  ) {
    return prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(${COMPARE_LIMIT_LOCK_NAMESPACE}, hashtext(${ownerLockKey(owner)}))`;

      const count = await tx.compareItem.count({ where: ownerWhere(owner) });
      if (count >= maxCompareItems) {
        throw new ApiError(
          400,
          `შედარებაში ერთდროულად მაქსიმუმ ${maxCompareItems} ერთეულის დამატებაა შესაძლებელი`,
          "COMPARE_LIMIT_REACHED",
          { limit: maxCompareItems },
        );
      }

      return tx.compareItem.create({ data: { ...owner, ...data }, include: compareItemInclude });
    });
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
  //
  // maxCompareItems is enforced here too — without it, a guest who filled
  // their own compare list up to the cap, logging into an account that's
  // separately already at (or near) the same cap, would merge past it with
  // no check at all. Once the user's count reaches the cap, remaining
  // guest items are dropped rather than merged — the same "just drop it"
  // tradeoff mergeGuestCompareIntoUser's own doc comment already accepts
  // for a duplicate item, applied here for a full compare list instead of
  // erroring out mid-login. The same advisory lock createUnderLimit uses
  // (scoped to this userId) serializes this against a concurrent
  // createUnderLimit call for the same user, so the count below can't be
  // stale either.
  async mergeGuestItem(
    item: {
      id: number;
      itemType: CompareItemType;
      productId: number | null;
      vehicleListingId: number | null;
    },
    guestId: string,
    userId: number,
    maxCompareItems: number,
  ) {
    await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(${COMPARE_LIMIT_LOCK_NAMESPACE}, hashtext(${ownerLockKey({ userId })}))`;

      const claimed = await tx.compareItem.deleteMany({ where: { id: item.id, guestId } });
      if (claimed.count === 0) return;

      const count = await tx.compareItem.count({ where: { userId } });
      if (count >= maxCompareItems) return;

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
