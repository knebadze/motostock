import { prisma } from "../../config/prisma.js";
import { productSummaryInclude } from "../products/products.repository.js";

export type ProductViewOwner = { userId: number } | { guestId: string };

function ownerWhere(owner: ProductViewOwner) {
  return "userId" in owner ? { userId: owner.userId } : { guestId: owner.guestId };
}

export const productViewsRepository = {
  // Upsert, not insert — one row per (owner, product), see product-view.prisma.
  upsertView(owner: ProductViewOwner, productId: number) {
    if ("userId" in owner) {
      return prisma.productView.upsert({
        where: { userId_productId: { userId: owner.userId, productId } },
        create: { userId: owner.userId, productId },
        update: { viewCount: { increment: 1 } },
      });
    }
    return prisma.productView.upsert({
      where: { guestId_productId: { guestId: owner.guestId, productId } },
      create: { guestId: owner.guestId, productId },
      update: { viewCount: { increment: 1 } },
    });
  },

  findByOwner(owner: ProductViewOwner, limit: number) {
    return prisma.productView.findMany({
      where: ownerWhere(owner),
      include: { product: { include: productSummaryInclude } },
      orderBy: { updatedAt: "desc" },
      take: limit,
    });
  },

  // Merge-on-login support (see product-views.service.ts
  // mergeGuestProductViewsIntoUser).
  findByGuestId(guestId: string) {
    return prisma.productView.findMany({ where: { guestId } });
  },

  // Atomically folds one guest view row into `userId`'s views. `deleteMany`
  // "claims" the guest row — only deletes (count 1) if it's still there
  // with this exact id+guestId — so a concurrent merge of the same guest
  // cookie (double-tab login) that already claimed it sees count 0 and
  // no-ops, instead of both callers double-summing the viewCount or one
  // crashing on an already-deleted row (P2025). `upsert` on conflict is
  // Postgres's native INSERT ... ON CONFLICT DO UPDATE — same
  // "sum the two viewCounts" behavior as before, but atomic even against a
  // *different* concurrent write (e.g. upsertView recording a fresh visit
  // to the same product right as this merge runs).
  async mergeGuestItem(
    view: { id: number; productId: number; viewCount: number },
    guestId: string,
    userId: number,
  ) {
    await prisma.$transaction(async (tx) => {
      const claimed = await tx.productView.deleteMany({ where: { id: view.id, guestId } });
      if (claimed.count === 0) return;

      await tx.productView.upsert({
        where: { userId_productId: { userId, productId: view.productId } },
        create: { userId, productId: view.productId, viewCount: view.viewCount },
        update: { viewCount: { increment: view.viewCount } },
      });
    });
  },

  // View-based "customers who viewed this also viewed" — every other
  // product viewed by anyone (user or guest) who also viewed `productId`,
  // ranked by how many of those viewers overlap. Unlike the order-based
  // co-occurrence in products.repository.ts, ProductView.productId is
  // already the product id (no variant indirection), so this is one groupBy.
  //
  // Both steps are bounded, unlike the original version of this query
  // (which pulled every viewer this product has ever had, then ran an
  // unbounded IN-list groupBy over all of them) — for a popular part with
  // years of accumulated distinct visitors, that was an unbounded fetch and
  // an unbounded IN clause on every single visit to its product page, not
  // just the rare admin action other unbounded queries in this codebase
  // tend to be. Sampling the RECENT_VIEWER_SAMPLE_SIZE most recent viewers
  // (not literally every viewer ever) is also arguably a better "still
  // relevant" signal for a co-viewed recommendation anyway. The final
  // sort+limit is now done DB-side (orderBy + take on the groupBy) instead
  // of fetching every candidate and slicing in JS — same pattern as
  // products.repository.ts's popularity ranking.
  async findCoViewedProductIds(productId: number, limit: number): Promise<number[]> {
    const RECENT_VIEWER_SAMPLE_SIZE = 500;

    const viewers = await prisma.productView.findMany({
      where: { productId },
      select: { userId: true, guestId: true },
      orderBy: { updatedAt: "desc" },
      take: RECENT_VIEWER_SAMPLE_SIZE,
    });
    if (viewers.length === 0) return [];

    const userIds = viewers
      .map((viewer) => viewer.userId)
      .filter((id): id is number => id != null);
    const guestIds = viewers
      .map((viewer) => viewer.guestId)
      .filter((id): id is string => id != null);
    if (userIds.length === 0 && guestIds.length === 0) return [];

    const grouped = await prisma.productView.groupBy({
      by: ["productId"],
      where: {
        productId: { not: productId },
        OR: [
          ...(userIds.length > 0 ? [{ userId: { in: userIds } }] : []),
          ...(guestIds.length > 0 ? [{ guestId: { in: guestIds } }] : []),
        ],
      },
      _count: { productId: true },
      orderBy: { _count: { productId: "desc" } },
      take: limit,
    });

    return grouped.map((group) => group.productId);
  },

  // Category/brand affinity signal for recommendations.service.ts's
  // listRecommendedForUser — the lightest-weight of its three signals (see
  // VIEW_AFFINITY_WEIGHT there).
  findViewAffinity(userId: number) {
    return prisma.productView.findMany({
      where: { userId },
      select: { product: { select: { categoryId: true, productBrandId: true } } },
    });
  },
};
