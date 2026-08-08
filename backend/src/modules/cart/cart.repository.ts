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

  incrementQuantity(id: number, by: number) {
    return prisma.cartItem.update({ where: { id }, data: { quantity: { increment: by } } });
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

  reassignToUser(id: number, userId: number) {
    return prisma.cartItem.update({ where: { id }, data: { userId, guestId: null } });
  },
};
