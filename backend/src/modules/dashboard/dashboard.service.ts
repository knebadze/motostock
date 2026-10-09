import { prisma } from "../../config/prisma.js";
import { shiftDateOnly, startOfDayTbilisi, toTbilisiDateOnly } from "../../lib/tbilisi-dates.js";
import {
  getDashboardRecentOrdersLimit,
  getDashboardLowStockLimit,
  getDashboardRecentActivityWindowDays,
  getLowStockThreshold,
} from "../settings/settings.service.js";

type StatusRow = { id: number; key: string; nameKa: string; nameEn: string; nameRu: string };

function toStatusLookup(status: StatusRow) {
  return { id: status.id, key: status.key, nameKa: status.nameKa, nameEn: status.nameEn, nameRu: status.nameRu };
}

// "Today" and "this week" are Tbilisi calendar boundaries (the server runs
// in UTC — see lib/tbilisi-dates.ts), with the week starting on Monday as
// it does in Georgia.
function tbilisiPeriodStarts(now: Date): { todayStart: Date; weekStart: Date } {
  const today = toTbilisiDateOnly(now);
  const dayOfWeek = new Date(`${today}T00:00:00.000Z`).getUTCDay(); // 0 = Sunday
  const daysSinceMonday = (dayOfWeek + 6) % 7;
  return {
    todayStart: startOfDayTbilisi(today),
    weekStart: startOfDayTbilisi(shiftDateOnly(today, -daysSinceMonday)),
  };
}

// Same "cancelled orders aren't sales" rule as revenueLast30Days below.
const NOT_CANCELLED = { status: { key: { not: "CANCELLED" } } } as const;

function toSalesSummary(agg: { _sum: { total: unknown }; _count: { _all: number } }) {
  return { revenue: Number(agg._sum.total ?? 0), orderCount: agg._count._all };
}

// Everything here is either a cheap indexed count/aggregate or a
// take-limited findMany — run together in one Promise.all so the whole
// dashboard is a single round trip instead of a waterfall of small requests.
export async function getDashboardStats() {
  const [recentOrdersLimit, lowStockLimit, recentActivityWindowDays, lowStockThreshold] =
    await Promise.all([
      getDashboardRecentOrdersLimit(),
      getDashboardLowStockLimit(),
      getDashboardRecentActivityWindowDays(),
      getLowStockThreshold(),
    ]);

  const now = new Date();
  const recentActivityWindowStart = new Date(now);
  recentActivityWindowStart.setDate(recentActivityWindowStart.getDate() - recentActivityWindowDays);

  const lowStockWhere = { stockQuantity: { lte: lowStockThreshold }, isActive: true };
  const { todayStart, weekStart } = tbilisiPeriodStarts(now);

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
    salesTodayAgg,
    salesThisWeekAgg,
    pendingOrders,
    confirmedOrders,
    finaFailedOrders,
    flaggedPendingOrders,
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
    // getDashboardRecentActivityWindowDays) rather than an all-time breakdown — keeps
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
      take: recentOrdersLimit,
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
      take: lowStockLimit,
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
      take: lowStockLimit,
      select: {
        id: true,
        stockQuantity: true,
        year: true,
        vehicleCatalog: {
          select: { brand: { select: { name: true } }, model: { select: { name: true } } },
        },
      },
    }),
    prisma.order.aggregate({
      _sum: { total: true },
      _count: { _all: true },
      where: { createdAt: { gte: todayStart }, ...NOT_CANCELLED },
    }),
    prisma.order.aggregate({
      _sum: { total: true },
      _count: { _all: true },
      where: { createdAt: { gte: weekStart }, ...NOT_CANCELLED },
    }),
    // "Needs action" — all-time, not windowed: an order still waiting is
    // waiting no matter how old it is (an old one is the most urgent).
    // PENDING = new, nobody has looked at it yet; CONFIRMED = accepted but
    // not yet shipped / handed over.
    prisma.order.count({ where: { status: { key: "PENDING" } } }),
    prisma.order.count({ where: { status: { key: "CONFIRMED" } } }),
    prisma.order.count({ where: { finaSyncStatus: "FAILED" } }),
    // Risk-flagged orders only matter while they can still be stopped.
    prisma.order.count({ where: { status: { key: "PENDING" }, riskFlags: { some: {} } } }),
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
    .slice(0, lowStockLimit);

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
    salesToday: toSalesSummary(salesTodayAgg),
    salesThisWeek: toSalesSummary(salesThisWeekAgg),
    needsAction: { pendingOrders, confirmedOrders, finaFailedOrders, flaggedPendingOrders },
    ordersByStatus,
    recentOrders,
    lowStockItems,
  };
}
