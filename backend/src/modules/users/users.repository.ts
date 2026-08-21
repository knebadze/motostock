import { prisma } from "../../config/prisma.js";
import { addressInclude } from "../addresses/addresses.repository.js";
import { vehicleCatalogInclude } from "../vehicle-catalog/vehicle-catalog.repository.js";
import { wishlistItemInclude } from "../wishlist/wishlist.repository.js";
import { cartItemInclude } from "../cart/cart.repository.js";

export const usersRepository = {
  findByEmail(email: string) {
    return prisma.user.findUnique({ where: { email }, include: { role: true } });
  },

  findById(id: number) {
    return prisma.user.findUnique({ where: { id }, include: { role: true } });
  },

  // Admin "full details" view — pulls in the address and garage alongside
  // the base account fields, so the admin panel can show everything about a
  // user in one modal without extra round-trips.
  findByIdWithDetails(id: number) {
    return prisma.user.findUnique({
      where: { id },
      include: {
        role: true,
        addresses: { include: addressInclude, orderBy: { createdAt: "desc" } },
        garageVehicles: {
          include: { vehicleCatalog: { include: vehicleCatalogInclude } },
          orderBy: { createdAt: "desc" },
        },
        wishlistItems: { include: wishlistItemInclude, orderBy: { createdAt: "desc" } },
        cartItems: { include: cartItemInclude, orderBy: { createdAt: "desc" } },
      },
    });
  },

  findMany(search?: string) {
    return prisma.user.findMany({
      where: search
        ? {
            OR: [
              { firstName: { contains: search, mode: "insensitive" } },
              { lastName: { contains: search, mode: "insensitive" } },
              { email: { contains: search, mode: "insensitive" } },
            ],
          }
        : undefined,
      include: { role: true },
      orderBy: { createdAt: "desc" },
    });
  },

  findByGoogleId(googleId: string) {
    return prisma.user.findUnique({ where: { googleId }, include: { role: true } });
  },

  findByFacebookId(facebookId: string) {
    return prisma.user.findUnique({ where: { facebookId }, include: { role: true } });
  },

  create(data: {
    email: string;
    firstName: string;
    lastName: string;
    passwordHash: string;
    roleId: number;
  }) {
    return prisma.user.create({ data, include: { role: true } });
  },

  createOAuthUser(data: {
    email: string;
    firstName: string;
    lastName: string;
    roleId: number;
    googleId?: string;
    facebookId?: string;
  }) {
    // OAuth accounts are pre-verified — the provider already confirmed this
    // email address, so there's no password-registration-style verification
    // step for them (see user.prisma's emailVerifiedAt comment).
    return prisma.user.create({
      data: { ...data, emailVerifiedAt: new Date() },
      include: { role: true },
    });
  },

  markEmailVerified(id: number) {
    return prisma.user.update({
      where: { id },
      data: { emailVerifiedAt: new Date() },
      include: { role: true },
    });
  },

  linkGoogleId(id: number, googleId: string) {
    return prisma.user.update({ where: { id }, data: { googleId }, include: { role: true } });
  },

  linkFacebookId(id: number, facebookId: string) {
    return prisma.user.update({ where: { id }, data: { facebookId }, include: { role: true } });
  },

  updatePasswordHash(id: number, passwordHash: string) {
    return prisma.user.update({ where: { id }, data: { passwordHash }, include: { role: true } });
  },
};
