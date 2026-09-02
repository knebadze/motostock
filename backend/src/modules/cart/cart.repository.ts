import { prisma } from "../../config/prisma.js";
import { vehicleListingInclude } from "../vehicle-listing/vehicle-listing.repository.js";
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
  // Same MAX_QUANTITY as cart.service.ts's own cap — duplicated rather than
  // imported (cart.service.ts already imports cartRepository from this
  // file, so importing back would be circular). Deliberately NOT capped by
  // current stockQuantity here, unlike every other cart-write path: this
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
    const MAX_QUANTITY = 99;

    await prisma.$transaction(async (tx) => {
      const claimed = await tx.cartItem.deleteMany({ where: { id: item.id, guestId } });
      if (claimed.count === 0) return;

      if (item.productVariantId != null) {
        const existing = await tx.cartItem.findUnique({
          where: { userId_productVariantId: { userId, productVariantId: item.productVariantId } },
          select: { quantity: true },
        });
        const quantity = Math.min((existing?.quantity ?? 0) + item.quantity, MAX_QUANTITY);
        await tx.cartItem.upsert({
          where: { userId_productVariantId: { userId, productVariantId: item.productVariantId } },
          create: {
            itemType: item.itemType,
            userId,
            productVariantId: item.productVariantId,
            quantity,
          },
          update: { quantity },
        });
      } else if (item.vehicleListingId != null) {
        const existing = await tx.cartItem.findUnique({
          where: { userId_vehicleListingId: { userId, vehicleListingId: item.vehicleListingId } },
          select: { quantity: true },
        });
        const quantity = Math.min((existing?.quantity ?? 0) + item.quantity, MAX_QUANTITY);
        await tx.cartItem.upsert({
          where: { userId_vehicleListingId: { userId, vehicleListingId: item.vehicleListingId } },
          create: {
            itemType: item.itemType,
            userId,
            vehicleListingId: item.vehicleListingId,
            quantity,
          },
          update: { quantity },
        });
      }
    });
  },
};
