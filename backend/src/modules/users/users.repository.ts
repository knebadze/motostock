import { randomUUID } from "node:crypto";
import type { Prisma } from "../../generated/prisma/index.js";
import { prisma } from "../../config/prisma.js";
import { addressInclude } from "../addresses/addresses.repository.js";
import { vehicleCatalogInclude } from "../vehicle-catalog/vehicle-catalog.repository.js";
import { wishlistItemInclude } from "../wishlist/wishlist.repository.js";
import { cartItemInclude } from "../cart/cart.repository.js";

// Shared between findMany and count so the two never drift apart — the
// admin user list's total (for pagination) must match exactly what the
// paged query would return.
function searchWhere(search?: string): Prisma.UserWhereInput | undefined {
  return search
    ? {
        OR: [
          { firstName: { contains: search, mode: "insensitive" } },
          { lastName: { contains: search, mode: "insensitive" } },
          { email: { contains: search, mode: "insensitive" } },
          { phone: { contains: search, mode: "insensitive" } },
        ],
      }
    : undefined;
}

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

  findMany(search: string | undefined, skip: number, take: number) {
    return prisma.user.findMany({
      where: searchWhere(search),
      include: { role: true },
      orderBy: { createdAt: "desc" },
      skip,
      take,
    });
  },

  count(search?: string) {
    return prisma.user.count({ where: searchWhere(search) });
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
    phone?: string | null;
    dateOfBirth?: Date | null;
  }) {
    return prisma.user.create({ data, include: { role: true } });
  },

  // The walk-in auto-merge key (auth.service.ts's registerUser) — only
  // matches rows that haven't already been converted/merged away, since a
  // phone is unique across all users regardless of walk-in status.
  findByPhone(phone: string) {
    return prisma.user.findUnique({ where: { phone }, include: { role: true } });
  },

  // Admin workshop "+ ახალი სტუმარი მომხმარებელი" action — synthetic email so
  // the unique/non-null constraint on User.email stays untouched; no
  // passwordHash, since a walk-in never logs in as itself.
  createWalkIn(data: { firstName: string; lastName: string; phone: string; dateOfBirth: Date; roleId: number }) {
    return prisma.user.create({
      data: {
        email: `walkin+${randomUUID()}@walkin.internal`,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        dateOfBirth: data.dateOfBirth,
        roleId: data.roleId,
        isWalkIn: true,
      },
      include: { role: true },
    });
  },

  // Converts an existing isWalkIn row into a real account in place (same id,
  // so GarageVehicle/ServiceRecord need no reassignment) — see
  // auth.service.ts's registerUser.
  convertWalkInToRegistered(
    id: number,
    data: { email: string; passwordHash: string; firstName: string; lastName: string; dateOfBirth: Date },
  ) {
    return prisma.user.update({
      where: { id },
      data: { ...data, isWalkIn: false },
      include: { role: true },
    });
  },

  // Admin manual-merge fallback (users.service.ts's mergeUserInto) — the
  // walk-in row is kept, not deleted (no delete-user feature exists), just
  // flagged so the admin list can show "შერწყმულია".
  setMergedInto(id: number, targetUserId: number) {
    return prisma.user.update({
      where: { id },
      data: { mergedIntoUserId: targetUserId },
      include: { role: true },
    });
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

  // Bumps tokenVersion alongside the hash so every previously-issued JWT for
  // this account (every other logged-in device) stops verifying — see
  // lib/jwt.ts's JwtPayload and auth.middleware.ts's resolveAuthenticatedUser.
  // Shared by both password-change paths (auth.service.ts's resetPassword,
  // users.service.ts's changePassword), so this one place covers both.
  updatePasswordHash(id: number, passwordHash: string) {
    return prisma.user.update({
      where: { id },
      data: { passwordHash, tokenVersion: { increment: 1 } },
      include: { role: true },
    });
  },
};
