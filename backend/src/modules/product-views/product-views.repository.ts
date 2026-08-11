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

  findByOwnerAndProduct(owner: ProductViewOwner, productId: number) {
    return prisma.productView.findFirst({ where: { ...ownerWhere(owner), productId } });
  },

  // Merge-on-login support (see product-views.service.ts
  // mergeGuestProductViewsIntoUser).
  findByGuestId(guestId: string) {
    return prisma.productView.findMany({ where: { guestId } });
  },

  reassignToUser(id: number, userId: number) {
    return prisma.productView.update({ where: { id }, data: { userId, guestId: null } });
  },

  incrementViewCount(id: number, by: number) {
    return prisma.productView.update({ where: { id }, data: { viewCount: { increment: by } } });
  },

  delete(id: number) {
    return prisma.productView.delete({ where: { id } });
  },

  // View-based "customers who viewed this also viewed" — every other
  // product viewed by anyone (user or guest) who also viewed `productId`,
  // ranked by how many of those viewers overlap. Unlike the order-based
  // co-occurrence in products.repository.ts, ProductView.productId is
  // already the product id (no variant indirection), so this is one groupBy.
  async findCoViewedProductIds(productId: number, limit: number): Promise<number[]> {
    const viewers = await prisma.productView.findMany({
      where: { productId },
      select: { userId: true, guestId: true },
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
    });

    return grouped
      .sort((a, b) => b._count.productId - a._count.productId)
      .slice(0, limit)
      .map((group) => group.productId);
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
