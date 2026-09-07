import { prisma } from "../../config/prisma.js";

export type VisitorOwner = { userId: number } | { guestId: string };

export const visitorsRepository = {
  // "Active now" heartbeat — upserts this visitor's single presence row to
  // the current instant. One row per distinct visitor ever (see
  // VisitorPresence's model comment), never one row per ping, so frequent
  // pings from the same visitor don't grow this table.
  touchPresence(owner: VisitorOwner) {
    const now = new Date();
    if ("userId" in owner) {
      return prisma.visitorPresence.upsert({
        where: { userId: owner.userId },
        create: { userId: owner.userId, lastSeenAt: now },
        update: { lastSeenAt: now },
      });
    }
    return prisma.visitorPresence.upsert({
      where: { guestId: owner.guestId },
      create: { guestId: owner.guestId, lastSeenAt: now },
      update: { lastSeenAt: now },
    });
  },

  countActiveSince(since: Date) {
    return prisma.visitorPresence.count({ where: { lastSeenAt: { gte: since } } });
  },

  // Insert-or-ignore for (date, visitor) — see VisitorVisit's model comment.
  // `update: {}` is a deliberate no-op on conflict (this row, once created
  // for a given day, never changes) — same idempotent-claim shape as
  // seed.ts's seedLookup upserts.
  async recordVisit(owner: VisitorOwner, date: string): Promise<void> {
    if ("userId" in owner) {
      await prisma.visitorVisit.upsert({
        where: { date_userId: { date, userId: owner.userId } },
        create: { date, userId: owner.userId },
        update: {},
      });
      return;
    }
    await prisma.visitorVisit.upsert({
      where: { date_guestId: { date, guestId: owner.guestId } },
      create: { date, guestId: owner.guestId },
      update: {},
    });
  },

  // Raw rows (not pre-aggregated) for a date range — see visitors.service.ts's
  // getVisitorOverview, which both counts rows per day (each row already IS
  // one unique visitor for that day) and de-duplicates visitor identity
  // across the whole range for a weekly unique count.
  findVisitsInRange(fromDate: string, toDate: string) {
    return prisma.visitorVisit.findMany({
      where: { date: { gte: fromDate, lte: toDate } },
      select: { date: true, userId: true, guestId: true },
    });
  },

  // Called from guest-identity.middleware.ts's mergeGuestDataIntoUser.
  // Unlike VisitorVisit below (many rows, one per day), there's at most one
  // guest presence row ever — folding it in is just "this person is now
  // this user, so their live status lives under the user's own row from
  // here on". Logging in is itself activity, so `now()` is an accurate
  // lastSeenAt regardless of what either row previously held.
  async mergeGuestPresenceIntoUser(guestId: string, userId: number): Promise<void> {
    const guest = await prisma.visitorPresence.findUnique({ where: { guestId } });
    if (!guest) return;

    const now = new Date();
    await prisma.visitorPresence.upsert({
      where: { userId },
      create: { userId, lastSeenAt: now },
      update: { lastSeenAt: now },
    });
    await prisma.visitorPresence.deleteMany({ where: { guestId } });
  },

  findGuestVisits(guestId: string) {
    return prisma.visitorVisit.findMany({ where: { guestId } });
  },

  // Same claim-then-upsert shape as product-views.repository.ts's
  // mergeGuestItem — a guest who visited on a day they *also* already
  // visited as this same (now-identified) user just has its guest row
  // dropped (already counted for that day), otherwise the row is
  // effectively re-owned to the user. Without this, a guest who visits then
  // logs in the same day would count as two distinct visitors for that day
  // instead of one.
  async mergeGuestVisit(visit: { id: number; date: string }, guestId: string, userId: number): Promise<void> {
    await prisma.$transaction(async (tx) => {
      const claimed = await tx.visitorVisit.deleteMany({ where: { id: visit.id, guestId } });
      if (claimed.count === 0) return;

      await tx.visitorVisit.upsert({
        where: { date_userId: { date: visit.date, userId } },
        create: { date: visit.date, userId },
        update: {},
      });
    });
  },
};
