import { prisma } from "../../config/prisma.js";
import type { AuthEventType, OrderRiskFlagType } from "../../generated/prisma/index.js";

export const fraudRepository = {
  createAuthEvent(data: {
    type: AuthEventType;
    email: string;
    userId: number | null;
    ipAddress: string | null;
  }) {
    return prisma.authEvent.create({ data });
  },

  createRiskFlags(orderId: number, flags: { type: OrderRiskFlagType; detail: string | null }[]) {
    if (flags.length === 0) return Promise.resolve({ count: 0 });
    return prisma.orderRiskFlag.createMany({
      data: flags.map((flag) => ({ orderId, ...flag })),
    });
  },

  countOrdersSince(userId: number, since: Date) {
    return prisma.order.count({ where: { userId, createdAt: { gte: since } } });
  },

  // Every distinct userId who has ever logged an AuthEvent or placed an
  // Order from this IP — the raw "who else used this address" signal
  // fraud.service.ts's evaluateOrderRisk narrows down from (excluding the
  // current order's own owner, and intersecting with promo-code usage).
  async findUserIdsForIp(ipAddress: string): Promise<number[]> {
    const [authEvents, orders] = await Promise.all([
      prisma.authEvent.findMany({
        where: { ipAddress, userId: { not: null } },
        select: { userId: true },
        distinct: ["userId"],
      }),
      prisma.order.findMany({
        where: { ipAddress },
        select: { userId: true },
        distinct: ["userId"],
      }),
    ]);

    const ids = new Set<number>();
    for (const row of authEvents) if (row.userId != null) ids.add(row.userId);
    for (const row of orders) ids.add(row.userId);
    return [...ids];
  },

  async findOtherPromoCodeUsers(promoCodeId: number, excludeUserId: number): Promise<number[]> {
    const rows = await prisma.order.findMany({
      where: { promoCodeId, userId: { not: excludeUserId } },
      select: { userId: true },
      distinct: ["userId"],
    });
    return rows.map((row) => row.userId);
  },

  // threshold/take pushed into the query itself (having + take), not applied
  // in JS after the fact — under a distributed credential-stuffing attack
  // (or just an old/low threshold setting) this groupBy would otherwise
  // fetch one row per distinct email that has EVER had a single failed
  // login in the window, sort all of them in JS, and only then discard the
  // ones below threshold. Same anti-pattern already fixed for the
  // popularity queries (see search_popularity_scaling) — having filters at
  // the DB, and take caps the worst case to a bounded page even if an
  // attack manages to push many distinct identifiers above threshold at
  // once.
  async countFailedLoginsByEmail(
    since: Date,
    threshold: number,
    limit = 50,
  ): Promise<{ email: string; count: number }[]> {
    const grouped = await prisma.authEvent.groupBy({
      by: ["email"],
      where: { type: "LOGIN_FAILURE", createdAt: { gte: since } },
      _count: { email: true },
      having: { email: { _count: { gte: threshold } } },
      orderBy: { _count: { email: "desc" } },
      take: limit,
    });
    return grouped.map((row) => ({ email: row.email, count: row._count.email }));
  },

  async countFailedLoginsByIp(
    since: Date,
    threshold: number,
    limit = 50,
  ): Promise<{ ipAddress: string; count: number }[]> {
    const grouped = await prisma.authEvent.groupBy({
      by: ["ipAddress"],
      where: { type: "LOGIN_FAILURE", createdAt: { gte: since }, ipAddress: { not: null } },
      _count: { ipAddress: true },
      having: { ipAddress: { _count: { gte: threshold } } },
      orderBy: { _count: { ipAddress: "desc" } },
      take: limit,
    });
    return grouped.map((row) => ({ ipAddress: row.ipAddress as string, count: row._count.ipAddress }));
  },
};
