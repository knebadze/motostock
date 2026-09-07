import type { Prisma } from "../../generated/prisma/index.js";
import { prisma } from "../../config/prisma.js";

// Shared between findManyForAdmin and countForAdmin so the two never drift
// apart, same pattern as users.repository.ts's searchWhere.
function searchWhere(search?: string): Prisma.SessionWhereInput | undefined {
  return search
    ? {
        user: {
          OR: [
            { firstName: { contains: search, mode: "insensitive" } },
            { lastName: { contains: search, mode: "insensitive" } },
            { email: { contains: search, mode: "insensitive" } },
          ],
        },
      }
    : undefined;
}

// Backs lib/jwt.ts's JwtPayload.sessionId — see session.prisma's comment
// for the full reasoning (a Session row is what makes logout actually
// revoke a token server-side, not just clear the browser's cookie).
export const sessionRepository = {
  create(userId: number, meta: { ipAddress: string | null; userAgent: string | null }) {
    return prisma.session.create({
      data: { userId, ipAddress: meta.ipAddress, userAgent: meta.userAgent },
      select: { id: true },
    });
  },

  findById(id: number) {
    return prisma.session.findUnique({ where: { id }, select: { id: true, lastSeenAt: true } });
  },

  // Fire-and-forget from auth.middleware.ts's sliding-timeout refresh
  // (throttled — see that call site) — deleteMany rather than update so a
  // session deleted concurrently (e.g. an admin revoking it, or logout, in
  // the gap between the read and this write) doesn't throw P2025.
  async touchLastSeen(id: number) {
    await prisma.session.updateMany({ where: { id }, data: { lastSeenAt: new Date() } });
  },

  // No-op (not an error) if the id doesn't exist — logout is best-effort
  // idempotent by design (see auth.controller.ts), so a token that's
  // already invalid/already-logged-out must not make this throw. Also used
  // as-is for admin-initiated revocation (see sessions.service.ts).
  async delete(id: number) {
    await prisma.session.deleteMany({ where: { id } });
  },

  // Admin "active sessions" list — see sessions.service.ts.
  findManyForAdmin(search: string | undefined, skip: number, take: number) {
    return prisma.session.findMany({
      where: searchWhere(search),
      include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } },
      orderBy: { lastSeenAt: "desc" },
      skip,
      take,
    });
  },

  countForAdmin(search?: string) {
    return prisma.session.count({ where: searchWhere(search) });
  },
};
