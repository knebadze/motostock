import { prisma } from "../../config/prisma.js";
import { LOW_STOCK_THRESHOLD } from "../../lib/low-stock.js";

const RECENT_ORDERS_LIMIT = 8;
// A comparison table stops being actionable well past this many rows on a
// glance-only dashboard — the full picture belongs on the future analytics
// page, not here.
const LOW_STOCK_LIMIT = 8;
// Shared by the revenue sum and the status breakdown below — both are
// "recent activity" snapshots for a glance dashboard, not lifetime totals
// (that's what totalOrders/the future analytics page are for). A lifetime
// per-status count would mean the query's cost grows forever with total
// order history, unlike everything else in this Promise.all batch, which
// stays bounded by either a `take` or a real filter.
const RECENT_ACTIVITY_WINDOW_DAYS = 30;

type StatusRow = { id: number; key: string; nameKa: string; nameEn: string; nameRu: string };

function toStatusLookup(status: StatusRow) {
  return { id: status.id, key: status.key, nameKa: status.nameKa, nameEn: status.nameEn, nameRu: status.nameRu };
}

// Everything here is either a cheap indexed count/aggregate or a
// take-limited findMany — run together in one Promise.all so the whole
// dashboard is a single round trip instead of a waterfall of small requests.
export async function getDashboardStats() {
  const now = new Date();
  const recentActivityWindowStart = new Date(now);
  recentActivityWindowStart.setDate(recentActivityWindowStart.getDate() - RECENT_ACTIVITY_WINDOW_DAYS);

  const lowStockWhere = { stockQuantity: { lte: LOW_STOCK_THRESHOLD }, isActive: true };

  const [
    totalOrders,
    totalUsers,
    totalProducts,
    totalVehicleListings,
    activePromoCodes,
    revenueAgg,
    statusCounts,
    orderStatuses,
    recentOrdersRaw,
    lowStockVariantCount,
    lowStockListingCount,
    lowStockVariants,
    lowStockListings,
  ] = await Promise.all([
    prisma.order.count(),
    prisma.user.count(),
    prisma.product.count(),
    prisma.vehicleListing.count(),
    prisma.promoCode.count({ where: { isActive: true, startDate: { lte: now }, endDate: { gte: now } } }),
    // Excludes CANCELLED orders — otherwise a cancelled order still counts
    // toward "revenue" for the rest of its 30-day window, overstating what
    // actually came in. Filtered by the status's stable `key` (statuses are
    // admin-editable rows, not a fixed enum) rather than a hardcoded id.
    prisma.order.aggregate({
      _sum: { total: true },
      where: { createdAt: { gte: recentActivityWindowStart }, status: { key: { not: "CANCELLED" } } },
    }),
    // Windowed like the revenue aggregate above (see
    // RECENT_ACTIVITY_WINDOW_DAYS) rather than an all-time breakdown — keeps
    // this query's cost bounded by the window instead of growing forever
    // with total lifetime order count, and a "what's active right now"
    // dashboard has more use for recent activity than an ever-growing
    // DELIVERED/CANCELLED tally anyway. Uses the new Order.createdAt index.
    prisma.order.groupBy({
      by: ["statusId"],
      _count: { _all: true },
      where: { createdAt: { gte: recentActivityWindowStart } },
    }),
    prisma.orderStatus.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.order.findMany({
      take: RECENT_ORDERS_LIMIT,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        orderCode: true,
        total: true,
        createdAt: true,
        status: true,
        user: { select: { firstName: true, lastName: true } },
      },
    }),
    prisma.productVariant.count({ where: lowStockWhere }),
    prisma.vehicleListing.count({ where: lowStockWhere }),
    prisma.productVariant.findMany({
      where: lowStockWhere,
      orderBy: { stockQuantity: "asc" },
      take: LOW_STOCK_LIMIT,
      select: {
        id: true,
        stockQuantity: true,
        size: { select: { nameKa: true } },
        color: { select: { nameKa: true } },
        product: { select: { id: true, nameKa: true } },
      },
    }),
    prisma.vehicleListing.findMany({
      where: lowStockWhere,
      orderBy: { stockQuantity: "asc" },
      take: LOW_STOCK_LIMIT,
      select: {
        id: true,
        stockQuantity: true,
        year: true,
        vehicleCatalog: {
          select: { brand: { select: { name: true } }, model: { select: { name: true } } },
        },
      },
    }),
  ]);

  const ordersByStatus = orderStatuses.map((status) => ({
    status: toStatusLookup(status),
    count: statusCounts.find((row) => row.statusId === status.id)?._count._all ?? 0,
  }));

  const recentOrders = recentOrdersRaw.map((order) => ({
    id: order.id,
    orderCode: order.orderCode,
    buyerName: `${order.user.firstName} ${order.user.lastName}`,
    status: toStatusLookup(order.status),
    total: Number(order.total),
    createdAt: order.createdAt,
  }));

  // Both queried with the same take-limit, then merged and re-sorted so the
  // combined list still reads worst-stock-first regardless of item type.
  // `id` is the link target (product id for a variant — variants have no
  // edit page of their own — or the listing id); `rowKey` is always unique
  // even when several low-stock variants share one product id.
  const lowStockItems = [
    ...lowStockVariants.map((variant) => ({
      id: variant.product.id,
      rowKey: `pv-${variant.id}`,
      itemType: "PRODUCT_VARIANT" as const,
      label: variant.product.nameKa,
      variantLabel: [variant.size?.nameKa, variant.color?.nameKa].filter(Boolean).join(" / ") || null,
      stockQuantity: variant.stockQuantity,
    })),
    ...lowStockListings.map((listing) => ({
      id: listing.id,
      rowKey: `vl-${listing.id}`,
      itemType: "VEHICLE_LISTING" as const,
      label: `${listing.vehicleCatalog.brand.name} ${listing.vehicleCatalog.model.name}`,
      variantLabel: String(listing.year),
      stockQuantity: listing.stockQuantity,
    })),
  ]
    .sort((a, b) => a.stockQuantity - b.stockQuantity)
    .slice(0, LOW_STOCK_LIMIT);

  return {
    counts: {
      totalOrders,
      totalUsers,
      totalProducts,
      totalVehicleListings,
      activePromoCodes,
      lowStockCount: lowStockVariantCount + lowStockListingCount,
    },
    revenueLast30Days: Number(revenueAgg._sum.total ?? 0),
    ordersByStatus,
    recentOrders,
    lowStockItems,
  };
}
