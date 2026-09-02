import { prisma } from "../../config/prisma.js";
import { vehicleListingInclude } from "../vehicle-listing/vehicle-listing.repository.js";
import { getCartMaxQuantity } from "../settings/settings.service.js";
import type { CartItemType } from "../../generated/prisma/index.js";

export type CartOwner = { userId: number } | { guestId: string };

function ownerWhere(owner: CartOwner) {
  return "userId" in owner ? { userId: owner.userId } : { guestId: owner.guestId };
}

const namedRefSelect = { id: true, nameKa: true, nameEn: true, nameRu: true, slug: true } as const;

const productVariantInclude = {
  size: true,
  color: true,
  images: { orderBy: { position: "asc" } },
  discounts: { orderBy: { startDate: "desc" } },
  product: {
    select: {
      id: true,
      nameKa: true,
      nameEn: true,
      nameRu: true,
      slug: true,
      imageUrl: true,
      category: { select: namedRefSelect },
    },
  },
} as const;

// Exported so users.repository.ts's admin "full detail" view can nest the
// same shape under User.cartItems without duplicating it.
export const cartItemInclude = {
  productVariant: { include: productVariantInclude },
  vehicleListing: { include: vehicleListingInclude },
} as const;

export const cartRepository = {
  findByOwner(owner: CartOwner) {
    return prisma.cartItem.findMany({
      where: ownerWhere(owner),
      include: cartItemInclude,
      orderBy: { createdAt: "desc" },
    });
  },

  countByOwner(owner: CartOwner) {
    return prisma.cartItem.aggregate({
      where: ownerWhere(owner),
      _sum: { quantity: true },
    });
  },

  findById(id: number) {
    return prisma.cartItem.findUnique({ where: { id }, include: cartItemInclude });
  },

  findByOwnerAndProductVariant(owner: CartOwner, productVariantId: number) {
    return prisma.cartItem.findFirst({ where: { ...ownerWhere(owner), productVariantId } });
  },

  findByOwnerAndVehicleListing(owner: CartOwner, vehicleListingId: number) {
    return prisma.cartItem.findFirst({ where: { ...ownerWhere(owner), vehicleListingId } });
  },

  // Lightweight existence+quantity check (AddToCartButton/CartDropdown's
  // initial "is this already in the cart" lookup) — mirrors
  // wishlist.repository.ts's findStatus, plus quantity since a stepper
  // needs a starting count, not just a boolean.
  findStatus(owner: CartOwner, productVariantIds: number[], vehicleListingIds: number[]) {
    return prisma.cartItem.findMany({
      where: {
        ...ownerWhere(owner),
        OR: [
          { productVariantId: { in: productVariantIds } },
          { vehicleListingId: { in: vehicleListingIds } },
        ],
      },
      select: { id: true, productVariantId: true, vehicleListingId: true, quantity: true },
    });
  },

  create(data: {
    itemType: CartItemType;
    userId?: number | null;
    guestId?: string | null;
    productVariantId?: number | null;
    vehicleListingId?: number | null;
    quantity: number;
  }) {
    return prisma.cartItem.create({ data, include: cartItemInclude });
  },

  updateQuantity(id: number, quantity: number) {
    return prisma.cartItem.update({ where: { id }, data: { quantity }, include: cartItemInclude });
  },

  // Atomic increment-with-cap — unlike updateQuantity above (which sets an
  // absolute value the caller already decided on), this is for "add N more
  // to whatever's already there" call sites (cart.service.ts's
  // addToExistingCartItem). Reading the current quantity in application
  // code, adding to it, and writing the computed absolute value back (the
  // old approach) is a classic lost-update race: two concurrent callers for
  // the same row (e.g. a live "add to cart" click racing a guest-cart merge
  // on login for the same item) can both read the same starting quantity
  // and each write their own computed total, so whichever commits last
  // silently discards the other's increment. Prisma's `increment` operator
  // is atomic at the DB row-lock level — concurrent increments to the same
  // row serialize instead of racing, so this always starts from the row's
  // true current value. The cap is enforced as a second, equally atomic
  // step (its WHERE is evaluated against live data at execution time, not a
  // value read earlier), not computed in JS beforehand.
  async incrementQuantityCapped(id: number, incrementBy: number, cap: number) {
    await prisma.$transaction(async (tx) => {
      await tx.cartItem.update({ where: { id }, data: { quantity: { increment: incrementBy } } });
      await tx.cartItem.updateMany({ where: { id, quantity: { gt: cap } }, data: { quantity: cap } });
    });
    return prisma.cartItem.findUniqueOrThrow({ where: { id }, include: cartItemInclude });
  },

  delete(id: number) {
    return prisma.cartItem.delete({ where: { id } });
  },

  // Bulk-empties the cart after a successful checkout (see orders.service.ts).
  deleteMany(owner: CartOwner) {
    return prisma.cartItem.deleteMany({ where: ownerWhere(owner) });
  },

  // Merge-on-login support (see cart.service.ts mergeGuestCartIntoUser).
  findByGuestId(guestId: string) {
    return prisma.cartItem.findMany({ where: { guestId } });
  },

  // Atomically folds one guest cart row into `userId`'s cart. `deleteMany`
  // "claims" the guest row — it only deletes (and returns count 1) if the
  // row still exists with this exact id+guestId — so a concurrent merge of
  // the same guest cookie (e.g. a double-tab login racing the same request
  // twice) that already claimed this row sees count 0 and no-ops, instead
  // of both callers incrementing the user's cart or the second one crashing
  // on an already-deleted row (P2025). Whichever caller wins the claim then
  // upserts into the user's cart — Postgres executes this as a native
  // INSERT ... ON CONFLICT DO UPDATE, so it's also safe against a
  // *different* concurrent write (e.g. the user adding the same item from
  // another tab) landing on the same target row. Wrapped in one transaction
  // so a crash between the claim and the upsert can't silently drop the
  // item — either both happen or neither does.
  // The upsert's `update` uses an atomic `increment`, not a JS-computed
  // absolute value — reading the existing quantity first and writing
  // `existing + item.quantity` back (the old approach) is a lost-update
  // race: this merge landing at the same moment as a live "add to cart"
  // click for the same item could read the same starting quantity as that
  // click and then overwrite its increment (or vice versa) when whichever
  // one commits last wins. `increment` instead always adds to the row's
  // true current value, however many concurrent writers there are. The cap
  // is enforced as a second, separately-atomic updateMany clamp right
  // after, for the same reason (its WHERE reads live data, not a stale
  // application-level snapshot) — same pattern as
  // cart.repository.ts's incrementQuantityCapped.
  // Same cap as cart.service.ts's own MAX_QUANTITY use sites, read fresh
  // here rather than passed in from cart.service.ts (which already imports
  // cartRepository from this file, so importing it back would be circular)
  // — settings.service.ts has no such cycle, so it's imported directly.
  // Deliberately NOT capped by current stockQuantity here, unlike every
  // other cart-write path: this
  // runs silently on login, with no user action to react to, so silently
  // shrinking a quantity the guest explicitly chose (because stock dropped
  // in the meantime) would just be confusing — "why did my 10 become 3?"
  // with no visible cause. A merged quantity that now exceeds stock is
  // instead surfaced at checkout time, where the customer can actually see
  // and act on it (see orders.service.ts's placeOrder, which reports how
  // many are actually left).
  async mergeGuestItem(
    item: {
      id: number;
      itemType: CartItemType;
      productVariantId: number | null;
      vehicleListingId: number | null;
      quantity: number;
    },
    guestId: string,
    userId: number,
  ) {
    const MAX_QUANTITY = await getCartMaxQuantity();

    await prisma.$transaction(async (tx) => {
      const claimed = await tx.cartItem.deleteMany({ where: { id: item.id, guestId } });
      if (claimed.count === 0) return;

      if (item.productVariantId != null) {
        await tx.cartItem.upsert({
          where: { userId_productVariantId: { userId, productVariantId: item.productVariantId } },
          create: {
            itemType: item.itemType,
            userId,
            productVariantId: item.productVariantId,
            quantity: Math.min(item.quantity, MAX_QUANTITY),
          },
          update: { quantity: { increment: item.quantity } },
        });
        await tx.cartItem.updateMany({
          where: { userId, productVariantId: item.productVariantId, quantity: { gt: MAX_QUANTITY } },
          data: { quantity: MAX_QUANTITY },
        });
      } else if (item.vehicleListingId != null) {
        await tx.cartItem.upsert({
          where: { userId_vehicleListingId: { userId, vehicleListingId: item.vehicleListingId } },
          create: {
            itemType: item.itemType,
            userId,
            vehicleListingId: item.vehicleListingId,
            quantity: Math.min(item.quantity, MAX_QUANTITY),
          },
          update: { quantity: { increment: item.quantity } },
        });
        await tx.cartItem.updateMany({
          where: { userId, vehicleListingId: item.vehicleListingId, quantity: { gt: MAX_QUANTITY } },
          data: { quantity: MAX_QUANTITY },
        });
      }
    });
  },
};
