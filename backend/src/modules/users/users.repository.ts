import { randomUUID } from "node:crypto";
import type { Prisma } from "../../generated/prisma/index.js";
import { prisma } from "../../config/prisma.js";
import { addressInclude } from "../addresses/addresses.repository.js";
import { vehicleCatalogInclude } from "../vehicle-catalog/vehicle-catalog.repository.js";
import { wishlistItemInclude } from "../wishlist/wishlist.repository.js";
import { cartItemInclude } from "../cart/cart.repository.js";

export type UserListFilters = {
  search?: string;
  role?: "USER" | "ADMIN";
  customerType?: "WALK_IN" | "REGISTERED" | "MERGED";
};

// Shared between findMany and count so the two never drift apart — the
// admin user list's total (for pagination) must match exactly what the
// paged query would return.
function buildWhere(filters: UserListFilters): Prisma.UserWhereInput | undefined {
  const and: Prisma.UserWhereInput[] = [];

  if (filters.search) {
    and.push({
      OR: [
        { firstName: { contains: filters.search, mode: "insensitive" } },
        { lastName: { contains: filters.search, mode: "insensitive" } },
        { email: { contains: filters.search, mode: "insensitive" } },
        { phone: { contains: filters.search, mode: "insensitive" } },
      ],
    });
  }

  if (filters.role) {
    and.push({ role: { name: filters.role } });
  }

  if (filters.customerType === "WALK_IN") {
    and.push({ isWalkIn: true });
  } else if (filters.customerType === "REGISTERED") {
    and.push({ isWalkIn: false });
  } else if (filters.customerType === "MERGED") {
    and.push({ mergedIntoUserId: { not: null } });
  }

  return and.length > 0 ? { AND: and } : undefined;
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

  findMany(filters: UserListFilters, skip: number, take: number) {
    return prisma.user.findMany({
      where: buildWhere(filters),
      include: { role: true },
      orderBy: { createdAt: "desc" },
      skip,
      take,
    });
  },

  count(filters: UserListFilters) {
    return prisma.user.count({ where: buildWhere(filters) });
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

  // birthday-email.service.ts's BIRTHDAY_EMAIL scheduled job — Prisma has no
  // month/day-of-date extraction in its query builder, so this needs a raw
  // query. isWalkIn rows are excluded: they only ever have a synthetic
  // walkin+<uuid>@walkin.internal placeholder address (see user.prisma's
  // isWalkIn comment), never a real one to send to. A Feb 29 birthday simply
  // won't match in a non-leap year, same as any other month/day-only
  // comparison — not worth working around for a once-a-year courtesy email.
  findUsersWithBirthdayToday(month: number, day: number) {
    return prisma.$queryRaw<{ id: number; email: string; firstName: string; lastName: string }[]>`
      SELECT id, email, "firstName", "lastName"
      FROM "dbo"."User"
      WHERE "dateOfBirth" IS NOT NULL
        AND "isWalkIn" = false
        AND EXTRACT(MONTH FROM "dateOfBirth") = ${month}
        AND EXTRACT(DAY FROM "dateOfBirth") = ${day}
    `;
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
