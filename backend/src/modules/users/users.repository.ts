import { randomUUID } from "node:crypto";
import type { Prisma } from "../../generated/prisma/index.js";
import { prisma } from "../../config/prisma.js";
import { addressInclude } from "../addresses/addresses.repository.js";
import { vehicleCatalogInclude } from "../vehicle-catalog/vehicle-catalog.repository.js";
import { wishlistItemInclude } from "../wishlist/wishlist.repository.js";
import { cartItemInclude } from "../cart/cart.repository.js";

export type UserListFilters = {
  search?: string;
  role?: "USER" | "ADMIN" | "OPERATOR";
  customerType?: "WALK_IN" | "REGISTERED" | "MERGED";
  // Set for an OPERATOR caller — ADMIN accounts are hidden from them (see
  // users.service.ts's assertCallerMaySeeUser).
  excludeRole?: "ADMIN";
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

  if (filters.excludeRole) {
    and.push({ role: { name: { not: filters.excludeRole } } });
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
  // Admin user-detail "orders" block: lifetime totals (cancelled orders
  // excluded from the money, same rule as the dashboard's revenue). The
  // full list lives in the separate order-history modal (paginated
  // /orders?userId=). Cheap indexed aggregates on Order.userId.
  findOrderSummary(userId: number) {
    return Promise.all([
      prisma.order.aggregate({
        where: { userId },
        _count: { _all: true },
        _max: { createdAt: true },
      }),
      prisma.order.aggregate({
        where: { userId, status: { key: { not: "CANCELLED" } } },
        _sum: { total: true },
      }),
    ]);
  },

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
  // auth.service.ts's registerUser. The WHERE re-checks isWalkIn: true (not
  // just id) so that two concurrent registrations racing on the same shared
  // phone number can't both "win": a plain update-by-id would let both
  // UPDATEs succeed (no unique constraint fires on a shared phone that's
  // already claimed by this same row), silently overwriting whichever
  // registrant committed first with the second one's email/password/name —
  // destroying the first registrant's account with no error raised anywhere.
  // With this guard, only the first UPDATE actually matches a row (count 1);
  // the second sees isWalkIn already false and gets count 0, signaling the
  // caller to treat it as a conflict instead of silently "succeeding".
  // mergedIntoUserId: null is defense in depth alongside registerUser's own
  // pre-check — a walk-in the admin already manually merged into a real
  // account (users.service.ts's mergeUserInto) keeps isWalkIn: true by
  // design (see that function's comment) but must never be resurrected as
  // someone's fresh registration; this row-level check makes that structurally
  // impossible even if a future caller forgets the pre-check.
  setPhoneClaim(walkInId: number, claimantUserId: number) {
    return prisma.user.updateMany({
      where: { id: walkInId, isWalkIn: true, mergedIntoUserId: null },
      data: { phoneClaimedByUserId: claimantUserId },
    });
  },

  // users.service.ts's mergeUserInto, in ONE transaction: claim the walk-in
  // (conditional — still a walk-in, not merged yet, so a concurrent merge or
  // a second click loses cleanly), move its garage (service records follow
  // their vehicles), and hand its phone to the target if the target has
  // none (the walk-in's phone is cleared first — phone is unique). The
  // walk-in row itself is kept (no delete-user feature exists), flagged so
  // the admin list can show "შერწყმულია". Null when the claim lost.
  mergeWalkInInto(fromUserId: number, targetUserId: number, transferPhone: string | null) {
    return prisma.$transaction(async (tx) => {
      const claimed = await tx.user.updateMany({
        where: { id: fromUserId, isWalkIn: true, mergedIntoUserId: null },
        data: {
          mergedIntoUserId: targetUserId,
          phoneClaimedByUserId: null,
          ...(transferPhone ? { phone: null } : {}),
        },
      });
      if (claimed.count !== 1) return null;
      await tx.garageVehicle.updateMany({ where: { userId: fromUserId }, data: { userId: targetUserId } });
      if (transferPhone) {
        await tx.user.update({ where: { id: targetUserId }, data: { phone: transferPhone } });
      }
      return tx.user.findUniqueOrThrow({ where: { id: fromUserId }, include: { role: true } });
    });
  },

  // No tokenVersion bump needed — resolveAuthenticatedUser (auth.middleware.ts)
  // re-reads role.name from the DB on every request rather than trusting the
  // JWT's own claim, so this takes effect on the target user's very next
  // request, not just their next login.
  updateRole(id: number, roleId: number) {
    return prisma.user.update({ where: { id }, data: { roleId }, include: { role: true } });
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
