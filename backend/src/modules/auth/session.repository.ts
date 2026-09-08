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

  // Called right after a password change bumps User.tokenVersion (see
  // users.service.ts's changePassword and auth.service.ts's resetPassword)
  // — every other session's row was otherwise left behind forever even
  // though resolveAuthenticatedUser's tokenVersion check makes it
  // permanently unusable from that point on, silently accumulating dead
  // entries on the admin "active sessions" page. `exceptSessionId` keeps
  // the session making the current request alive (it gets a freshly
  // re-signed cookie in the same response, not a new row) — omit it when
  // there's no "current" session to preserve (a forgot-password reset,
  // where the caller wasn't authenticated to begin with and a brand new
  // session is created separately).
  async deleteAllForUserExcept(userId: number, exceptSessionId?: number): Promise<void> {
    await prisma.session.deleteMany({
      where: { userId, ...(exceptSessionId != null ? { id: { not: exceptSessionId } } : {}) },
    });
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

  // See pruneStaleAuthArtifacts (auth.service.ts) for why `createdAt` (not
  // lastSeenAt) is the safe cutoff — createdAt is this row's immutable
  // loginAt, and isSessionExpiredByAbsoluteCap already permanently rejects
  // any token whose loginAt is this old, regardless of how recently
  // lastSeenAt was refreshed.
  async deleteCreatedBefore(cutoff: Date): Promise<number> {
    const { count } = await prisma.session.deleteMany({ where: { createdAt: { lt: cutoff } } });
    return count;
  },
};
