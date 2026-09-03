import { analyticsRepository } from "./analytics.repository.js";
import { startOfDayTbilisi, endOfDayTbilisi, toTbilisiDateOnly, shiftDateOnly } from "../../lib/tbilisi-dates.js";
import {
  getAnalyticsDefaultWindowDays,
  getDashboardDemandCandidateLimit,
  getDashboardRecentCancelledLimit,
} from "../settings/settings.service.js";

// dateFromInput/dateToInput are bare "YYYY-MM-DD" (z.iso.date() — see
// analytics.schema.ts) — anchored to Tbilisi's calendar day (see
// lib/tbilisi-dates.ts), not UTC, so "today" in the default (no explicit
// range) case matches what an admin physically in Georgia means by "today",
// and an explicit ?dateTo=2026-08-15 covers that whole day locally instead
// of cutting off ~20 hours early.
async function resolveDateRange(
  dateFromInput?: string,
  dateToInput?: string,
): Promise<{ from: Date; to: Date }> {
  const toDateOnly = dateToInput ?? toTbilisiDateOnly(new Date());
  // windowDays - 1, not windowDays: [from, to] is inclusive on both ends
  // (see startOfDayTbilisi/endOfDayTbilisi below), so shifting back by the
  // full window count would span windowDays + 1 calendar days (today plus
  // windowDays prior days) — "last 30 days" must mean today and the 29
  // days before it, 30 days total, not 31.
  const fromDateOnly =
    dateFromInput ?? shiftDateOnly(toDateOnly, -((await getAnalyticsDefaultWindowDays()) - 1));

  return { from: startOfDayTbilisi(fromDateOnly), to: endOfDayTbilisi(toDateOnly) };
}

function topNIds(counts: Map<number, number>, limit: number): number[] {
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([id]) => id);
}

// Alias for readability at call sites below — buckets an order into the
// Tbilisi calendar day it was placed on, not the UTC one.
const toDayKey = toTbilisiDateOnly;

// Zero-filled day series between from/to (inclusive) — a chart shouldn't
// skip days with no orders, otherwise the x-axis spacing lies. Walks
// Tbilisi calendar-day strings directly (not Date-object setHours/getDate,
// which are local-timezone-dependent and would walk UTC days on a server
// that isn't itself running in Tbilisi time).
function buildRevenueSeries(rows: { createdAt: Date; total: unknown }[], from: Date, to: Date) {
  const totalsByDay = new Map<string, number>();
  for (const row of rows) {
    const key = toDayKey(row.createdAt);
    totalsByDay.set(key, (totalsByDay.get(key) ?? 0) + Number(row.total));
  }

  const series: { date: string; revenue: number }[] = [];
  const toKey = toTbilisiDateOnly(to);
  let cursorKey = toTbilisiDateOnly(from);
  while (cursorKey <= toKey) {
    series.push({ date: cursorKey, revenue: totalsByDay.get(cursorKey) ?? 0 });
    cursorKey = shiftDateOnly(cursorKey, 1);
  }
  return series;
}

export async function getAnalyticsOverview(dateFromInput?: string, dateToInput?: string) {
  const [{ from, to }, demandCandidateLimit, recentCancelledLimit] = await Promise.all([
    resolveDateRange(dateFromInput, dateToInput),
    getDashboardDemandCandidateLimit(),
    getDashboardRecentCancelledLimit(),
  ]);

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
    analyticsRepository.findRecentCancelledOrders(from, to, recentCancelledLimit),
    analyticsRepository.findTopViewedProductIds(demandCandidateLimit),
    analyticsRepository.findTopViewedVehicleListingIds(demandCandidateLimit),
    analyticsRepository.findWishlistCountsByProduct(),
    analyticsRepository.findWishlistCountsByVehicleListing(),
    analyticsRepository.findCartCountsByProduct(),
    analyticsRepository.findCartCountsByVehicleListing(),
    analyticsRepository.findSalesByProduct(from, to),
    analyticsRepository.findSalesByVehicleListing(from, to),
  ]);

  const productCandidateIds = new Set<number>([
    ...topViewedProductIds,
    ...topNIds(wishlistByProduct, demandCandidateLimit),
    ...topNIds(cartByProduct, demandCandidateLimit),
    ...topNIds(
      new Map(Array.from(salesByProduct.entries()).map(([id, v]) => [id, v.quantity])),
      demandCandidateLimit,
    ),
  ]);
  const listingCandidateIds = new Set<number>([
    ...topViewedListingIds,
    ...topNIds(wishlistByListing, demandCandidateLimit),
    ...topNIds(cartByListing, demandCandidateLimit),
    ...topNIds(
      new Map(Array.from(salesByListing.entries()).map(([id, v]) => [id, v.quantity])),
      demandCandidateLimit,
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

  // productCandidateIds/listingCandidateIds is a *union* of four
  // independently-capped top-N lists (most viewed, most wishlisted, most
  // carted, most sold) — each is bounded by demandCandidateLimit on its
  // own, but with little overlap between the four rankings the union (and
  // therefore productRows/listingRows below) can hold up to 4x
  // demandCandidateLimit distinct rows. Without slicing again after the
  // final sort, the table sent to the frontend inherited that unbounded
  // union size instead of the configured display limit.
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
    .sort((a, b) => b.viewCount - a.viewCount)
    .slice(0, demandCandidateLimit);

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
    .sort((a, b) => b.viewCount - a.viewCount)
    .slice(0, demandCandidateLimit);

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
    // Was order.createdAt (when the order was *placed*) — wrong for a
    // "recently cancelled" list, whose whole point is showing when the
    // cancellation happened. cancelledAt is the field that actually means
    // that now (see order.prisma's comment).
    cancelledAt: order.cancelledAt,
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
