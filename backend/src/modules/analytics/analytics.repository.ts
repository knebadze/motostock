import { prisma } from "../../config/prisma.js";

const CANCELLED_KEY = "CANCELLED";

export const analyticsRepository = {
  // ---- Product demand ----

  findTopViewedProductIds(limit: number) {
    return prisma.product
      .findMany({ orderBy: { viewCount: "desc" }, take: limit, select: { id: true } })
      .then((rows) => rows.map((row) => row.id));
  },

  findTopViewedVehicleListingIds(limit: number) {
    return prisma.vehicleListing
      .findMany({ orderBy: { viewCount: "desc" }, take: limit, select: { id: true } })
      .then((rows) => rows.map((row) => row.id));
  },

  findProductDisplayRows(ids: number[]) {
    return prisma.product.findMany({
      where: { id: { in: ids } },
      select: { id: true, nameKa: true, viewCount: true },
    });
  },

  findVehicleListingDisplayRows(ids: number[]) {
    return prisma.vehicleListing.findMany({
      where: { id: { in: ids } },
      select: {
        id: true,
        viewCount: true,
        vehicleCatalog: {
          select: { brand: { select: { name: true } }, model: { select: { name: true } } },
        },
      },
    });
  },

  async findWishlistCountsByProduct(): Promise<Map<number, number>> {
    const grouped = await prisma.wishlistItem.groupBy({
      by: ["productId"],
      where: { productId: { not: null } },
      _count: { _all: true },
    });
    return new Map(grouped.map((row) => [row.productId as number, row._count._all]));
  },

  async findWishlistCountsByVehicleListing(): Promise<Map<number, number>> {
    const grouped = await prisma.wishlistItem.groupBy({
      by: ["vehicleListingId"],
      where: { vehicleListingId: { not: null } },
      _count: { _all: true },
    });
    return new Map(grouped.map((row) => [row.vehicleListingId as number, row._count._all]));
  },

  // Distinct-cart-row count, not summed quantity — "how many carts contain
  // this" is a more honest demand signal than "how many units are sitting
  // in carts" (one buyer adding qty 50 shouldn't outrank 50 buyers adding
  // qty 1 each). Rolled up variant->product the same way
  // products.repository.ts's findPopularProductIds already does, since
  // CartItem is variant-level (see cart-item.prisma).
  async findCartCountsByProduct(): Promise<Map<number, number>> {
    const grouped = await prisma.cartItem.groupBy({
      by: ["productVariantId"],
      where: { productVariantId: { not: null } },
      _count: { _all: true },
    });
    if (grouped.length === 0) return new Map();

    const variantIds = grouped.map((row) => row.productVariantId as number);
    const variants = await prisma.productVariant.findMany({
      where: { id: { in: variantIds } },
      select: { id: true, productId: true },
    });
    const productIdByVariantId = new Map(variants.map((variant) => [variant.id, variant.productId]));

    const counts = new Map<number, number>();
    for (const row of grouped) {
      const productId = productIdByVariantId.get(row.productVariantId as number);
      if (productId == null) continue;
      counts.set(productId, (counts.get(productId) ?? 0) + row._count._all);
    }
    return counts;
  },

  async findCartCountsByVehicleListing(): Promise<Map<number, number>> {
    const grouped = await prisma.cartItem.groupBy({
      by: ["vehicleListingId"],
      where: { vehicleListingId: { not: null } },
      _count: { _all: true },
    });
    return new Map(grouped.map((row) => [row.vehicleListingId as number, row._count._all]));
  },

  async findSalesByProduct(
    dateFrom: Date,
    dateTo: Date,
  ): Promise<Map<number, { quantity: number; revenue: number }>> {
    const grouped = await prisma.orderItem.groupBy({
      by: ["productVariantId"],
      where: {
        productVariantId: { not: null },
        order: { createdAt: { gte: dateFrom, lte: dateTo }, status: { key: { not: CANCELLED_KEY } } },
      },
      _sum: { quantity: true, lineTotal: true },
    });
    if (grouped.length === 0) return new Map();

    const variantIds = grouped.map((row) => row.productVariantId as number);
    const variants = await prisma.productVariant.findMany({
      where: { id: { in: variantIds } },
      select: { id: true, productId: true },
    });
    const productIdByVariantId = new Map(variants.map((variant) => [variant.id, variant.productId]));

    const totals = new Map<number, { quantity: number; revenue: number }>();
    for (const row of grouped) {
      const productId = productIdByVariantId.get(row.productVariantId as number);
      if (productId == null) continue;
      const existing = totals.get(productId) ?? { quantity: 0, revenue: 0 };
      existing.quantity += row._sum.quantity ?? 0;
      existing.revenue += Number(row._sum.lineTotal ?? 0);
      totals.set(productId, existing);
    }
    return totals;
  },

  async findSalesByVehicleListing(
    dateFrom: Date,
    dateTo: Date,
  ): Promise<Map<number, { quantity: number; revenue: number }>> {
    const grouped = await prisma.orderItem.groupBy({
      by: ["vehicleListingId"],
      where: {
        vehicleListingId: { not: null },
        order: { createdAt: { gte: dateFrom, lte: dateTo }, status: { key: { not: CANCELLED_KEY } } },
      },
      _sum: { quantity: true, lineTotal: true },
    });
    return new Map(
      grouped.map((row) => [
        row.vehicleListingId as number,
        { quantity: row._sum.quantity ?? 0, revenue: Number(row._sum.lineTotal ?? 0) },
      ]),
    );
  },

  // ---- Financial ----

  findRevenueAndOrderCount(dateFrom: Date, dateTo: Date) {
    return prisma.order.aggregate({
      _sum: { total: true },
      _count: { _all: true },
      where: { createdAt: { gte: dateFrom, lte: dateTo }, status: { key: { not: CANCELLED_KEY } } },
    });
  },

  async findOrderCountsByStatus(dateFrom: Date, dateTo: Date) {
    const [statuses, counts] = await Promise.all([
      prisma.orderStatus.findMany({ orderBy: { sortOrder: "asc" } }),
      prisma.order.groupBy({
        by: ["statusId"],
        _count: { _all: true },
        where: { createdAt: { gte: dateFrom, lte: dateTo } },
      }),
    ]);

    return statuses.map((status) => ({
      status: { id: status.id, key: status.key, nameKa: status.nameKa, nameEn: status.nameEn, nameRu: status.nameRu },
      count: counts.find((row) => row.statusId === status.id)?._count._all ?? 0,
    }));
  },

  // Row-per-order in range — bucketed into a day-series in the service
  // layer (JS, not $queryRaw/date_trunc — no raw SQL exists anywhere else
  // in this codebase, every other aggregate here is plain Prisma).
  findRevenueSeriesRows(dateFrom: Date, dateTo: Date) {
    return prisma.order.findMany({
      where: { createdAt: { gte: dateFrom, lte: dateTo }, status: { key: { not: CANCELLED_KEY } } },
      select: { createdAt: true, total: true },
    });
  },

  // ---- Cancellations ----

  // dateFrom/dateTo bound *when the order was cancelled*, not when it was
  // originally placed — cancelledAt (order.prisma) is set exactly once,
  // atomically, by orders.repository.ts's updateStatus when an order
  // becomes CANCELLED, and never touched again. Filtering by createdAt here
  // instead would answer a different question ("orders placed in this
  // range that are now cancelled, whenever that happened") than the rest
  // of this page's cancellation metrics, and could disagree with the
  // "recently cancelled" list for the exact same range — an order placed
  // inside the range but cancelled outside it (or vice versa) would count
  // on one side and not the other. Previously used updatedAt as a stand-in,
  // which a later, unrelated order.update (e.g. a manual FINA-retry click
  // days after the actual cancellation — fina-sync.repository.ts's
  // setOrderFinaSyncStatus) would silently rewrite, misreporting when the
  // cancellation actually happened.
  countCancelledOrders(dateFrom: Date, dateTo: Date) {
    return prisma.order.count({
      where: { status: { key: CANCELLED_KEY }, cancelledAt: { gte: dateFrom, lte: dateTo } },
    });
  },

  async sumLostRevenue(dateFrom: Date, dateTo: Date): Promise<number> {
    const agg = await prisma.order.aggregate({
      _sum: { total: true },
      where: { status: { key: CANCELLED_KEY }, cancelledAt: { gte: dateFrom, lte: dateTo } },
    });
    return Number(agg._sum.total ?? 0);
  },

  async findCancellationReasonBreakdown(dateFrom: Date, dateTo: Date) {
    const [reasons, counts] = await Promise.all([
      prisma.cancellationReason.findMany({ orderBy: { nameKa: "asc" } }),
      prisma.order.groupBy({
        by: ["cancellationReasonId"],
        _count: { _all: true },
        where: { status: { key: CANCELLED_KEY }, cancelledAt: { gte: dateFrom, lte: dateTo } },
      }),
    ]);

    type ReasonCountRow = {
      reason: { id: number; key: string; nameKa: string; nameEn: string; nameRu: string } | null;
      count: number;
    };

    const rows: ReasonCountRow[] = reasons.map((reason) => ({
      reason: { id: reason.id, key: reason.key, nameKa: reason.nameKa, nameEn: reason.nameEn, nameRu: reason.nameRu },
      count: counts.find((row) => row.cancellationReasonId === reason.id)?._count._all ?? 0,
    }));

    // Pre-Feature-1 cancelled orders (or any edge case) carry no reason —
    // surfaced as its own explicit row instead of silently dropped.
    const unspecified = counts.find((row) => row.cancellationReasonId === null)?._count._all ?? 0;
    if (unspecified > 0) {
      rows.push({ reason: null, count: unspecified });
    }
    return rows;
  },

  findRecentCancelledOrders(from: Date, to: Date, limit: number) {
    return prisma.order.findMany({
      // cancelledAt — see countCancelledOrders' comment above. Filtered by
      // the same [from, to] window as every other cancellation metric on
      // this page, so this list can't show cancellations from outside the
      // range the rest of the page is reporting on.
      where: { status: { key: CANCELLED_KEY }, cancelledAt: { gte: from, lte: to } },
      orderBy: { cancelledAt: "desc" },
      take: limit,
      include: {
        cancellationReason: true,
        user: { select: { firstName: true, lastName: true, email: true } },
      },
    });
  },
};
