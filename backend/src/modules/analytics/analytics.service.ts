import { analyticsRepository } from "./analytics.repository.js";

const DEFAULT_WINDOW_DAYS = 30;
// Per-signal candidate pool for the demand tables — union of the top N by
// each of views/wishlist/cart/sales, not just top-viewed, so a product that
// e.g. sells well but rarely gets browsed still shows up.
const DEMAND_CANDIDATE_LIMIT = 10;
const RECENT_CANCELLED_LIMIT = 10;

function resolveDateRange(dateFromInput?: string, dateToInput?: string): { from: Date; to: Date } {
  const to = dateToInput ? new Date(dateToInput) : new Date();
  to.setHours(23, 59, 59, 999);

  const from = dateFromInput ? new Date(dateFromInput) : new Date(to);
  if (!dateFromInput) {
    from.setDate(from.getDate() - DEFAULT_WINDOW_DAYS);
  }
  from.setHours(0, 0, 0, 0);

  return { from, to };
}

function topNIds(counts: Map<number, number>, limit: number): number[] {
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([id]) => id);
}

function toDayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

// Zero-filled day series between from/to (inclusive) — a chart shouldn't
// skip days with no orders, otherwise the x-axis spacing lies.
function buildRevenueSeries(rows: { createdAt: Date; total: unknown }[], from: Date, to: Date) {
  const totalsByDay = new Map<string, number>();
  for (const row of rows) {
    const key = toDayKey(row.createdAt);
    totalsByDay.set(key, (totalsByDay.get(key) ?? 0) + Number(row.total));
  }

  const series: { date: string; revenue: number }[] = [];
  const cursor = new Date(from);
  cursor.setHours(0, 0, 0, 0);
  const end = new Date(to);
  end.setHours(0, 0, 0, 0);
  while (cursor <= end) {
    const key = toDayKey(cursor);
    series.push({ date: key, revenue: totalsByDay.get(key) ?? 0 });
    cursor.setDate(cursor.getDate() + 1);
  }
  return series;
}

export async function getAnalyticsOverview(dateFromInput?: string, dateToInput?: string) {
  const { from, to } = resolveDateRange(dateFromInput, dateToInput);

  const [
    revenueAgg,
    ordersByStatus,
    revenueRows,
    cancelledCount,
    lostRevenue,
    reasonBreakdown,
    recentCancelledRaw,
    topViewedProductIds,
    topViewedListingIds,
    wishlistByProduct,
    wishlistByListing,
    cartByProduct,
    cartByListing,
    salesByProduct,
    salesByListing,
  ] = await Promise.all([
    analyticsRepository.findRevenueAndOrderCount(from, to),
    analyticsRepository.findOrderCountsByStatus(from, to),
    analyticsRepository.findRevenueSeriesRows(from, to),
    analyticsRepository.countCancelledOrders(from, to),
    analyticsRepository.sumLostRevenue(from, to),
    analyticsRepository.findCancellationReasonBreakdown(from, to),
    analyticsRepository.findRecentCancelledOrders(RECENT_CANCELLED_LIMIT),
    analyticsRepository.findTopViewedProductIds(DEMAND_CANDIDATE_LIMIT),
    analyticsRepository.findTopViewedVehicleListingIds(DEMAND_CANDIDATE_LIMIT),
    analyticsRepository.findWishlistCountsByProduct(),
    analyticsRepository.findWishlistCountsByVehicleListing(),
    analyticsRepository.findCartCountsByProduct(),
    analyticsRepository.findCartCountsByVehicleListing(),
    analyticsRepository.findSalesByProduct(from, to),
    analyticsRepository.findSalesByVehicleListing(from, to),
  ]);

  const productCandidateIds = new Set<number>([
    ...topViewedProductIds,
    ...topNIds(wishlistByProduct, DEMAND_CANDIDATE_LIMIT),
    ...topNIds(cartByProduct, DEMAND_CANDIDATE_LIMIT),
    ...topNIds(
      new Map(Array.from(salesByProduct.entries()).map(([id, v]) => [id, v.quantity])),
      DEMAND_CANDIDATE_LIMIT,
    ),
  ]);
  const listingCandidateIds = new Set<number>([
    ...topViewedListingIds,
    ...topNIds(wishlistByListing, DEMAND_CANDIDATE_LIMIT),
    ...topNIds(cartByListing, DEMAND_CANDIDATE_LIMIT),
    ...topNIds(
      new Map(Array.from(salesByListing.entries()).map(([id, v]) => [id, v.quantity])),
      DEMAND_CANDIDATE_LIMIT,
    ),
  ]);

  const [productRows, listingRows] = await Promise.all([
    productCandidateIds.size > 0
      ? analyticsRepository.findProductDisplayRows(Array.from(productCandidateIds))
      : Promise.resolve([]),
    listingCandidateIds.size > 0
      ? analyticsRepository.findVehicleListingDisplayRows(Array.from(listingCandidateIds))
      : Promise.resolve([]),
  ]);

  const topProducts = productRows
    .map((row) => {
      const sales = salesByProduct.get(row.id);
      return {
        id: row.id,
        nameKa: row.nameKa,
        viewCount: row.viewCount,
        wishlistCount: wishlistByProduct.get(row.id) ?? 0,
        cartCount: cartByProduct.get(row.id) ?? 0,
        quantitySold: sales?.quantity ?? 0,
        revenue: sales?.revenue ?? 0,
      };
    })
    .sort((a, b) => b.viewCount - a.viewCount);

  const topVehicleListings = listingRows
    .map((row) => {
      const sales = salesByListing.get(row.id);
      return {
        id: row.id,
        label: `${row.vehicleCatalog.brand.name} ${row.vehicleCatalog.model.name}`,
        viewCount: row.viewCount,
        wishlistCount: wishlistByListing.get(row.id) ?? 0,
        cartCount: cartByListing.get(row.id) ?? 0,
        quantitySold: sales?.quantity ?? 0,
        revenue: sales?.revenue ?? 0,
      };
    })
    .sort((a, b) => b.viewCount - a.viewCount);

  const revenue = Number(revenueAgg._sum.total ?? 0);
  const orderCount = revenueAgg._count._all;

  const recentCancelledOrders = recentCancelledRaw.map((order) => ({
    id: order.id,
    orderCode: order.orderCode,
    buyerName: `${order.user.firstName} ${order.user.lastName}`.trim(),
    buyerEmail: order.user.email,
    total: Number(order.total),
    reason: order.cancellationReason
      ? {
          id: order.cancellationReason.id,
          key: order.cancellationReason.key,
          nameKa: order.cancellationReason.nameKa,
          nameEn: order.cancellationReason.nameEn,
          nameRu: order.cancellationReason.nameRu,
        }
      : null,
    note: order.cancellationNote,
    createdAt: order.createdAt,
  }));

  return {
    range: { from: from.toISOString(), to: to.toISOString() },
    financial: {
      revenue,
      orderCount,
      cancelledCount,
      cancellationRate: orderCount + cancelledCount > 0 ? cancelledCount / (orderCount + cancelledCount) : 0,
      lostRevenue,
    },
    revenueSeries: buildRevenueSeries(revenueRows, from, to),
    ordersByStatus,
    topProducts,
    topVehicleListings,
    cancellations: {
      reasonBreakdown,
      recentOrders: recentCancelledOrders,
    },
  };
}
