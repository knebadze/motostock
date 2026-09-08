  import { shiftDateOnly, toTbilisiDateOnly } from "../../lib/tbilisi-dates.js";
import { visitorsRepository, type VisitorOwner } from "./visitors.repository.js";

// Matches the frontend ping interval (see VisitorPingBeacon.tsx) with
// enough slack that a tab that's still open but between pings isn't
// mistakenly dropped out of "active now".
const ACTIVE_WINDOW_MS = 5 * 60 * 1000;

// 7 calendar days inclusive of today — shiftDateOnly(-6) rather than -7,
// same off-by-one reasoning as analytics.service.ts's resolveDateRange
// (a window of N days means today plus the N-1 days before it).
const WEEK_WINDOW_DAYS = 7;

export async function recordVisitorPing(owner: VisitorOwner): Promise<void> {
  const today = toTbilisiDateOnly(new Date());
  await Promise.all([visitorsRepository.touchPresence(owner), visitorsRepository.recordVisit(owner, today)]);
}

// Called from guest-identity.middleware.ts's mergeGuestDataIntoUser, right
// alongside the wishlist/cart/compare/view merges — without this, a guest
// who visited earlier today and then logs in would be double-counted as
// two distinct visitors for today (one guest row, one fresh user row)
// instead of recognized as the same person.
export async function mergeGuestVisitorDataIntoUser(guestId: string, userId: number): Promise<void> {
  await visitorsRepository.mergeGuestPresenceIntoUser(guestId, userId);

  const guestVisits = await visitorsRepository.findGuestVisits(guestId);
  for (const visit of guestVisits) {
    await visitorsRepository.mergeGuestVisit(visit, guestId, userId);
  }
}

// Presence rows older than this serve no purpose — getVisitorOverview only
// ever looks at the last ACTIVE_WINDOW_MS for "active now" — so anything
// older is pure dead weight.
const PRESENCE_RETENTION_MS = 24 * 60 * 60 * 1000;

// Visit rows feed today's/this week's stats today, with enough headroom for
// a future monthly view without another migration; anything older is
// pruned so the table's growth stays bounded by "distinct visitors x ~90
// days" instead of unbounded. This matters more for VisitorVisit/
// VisitorPresence than most other tables in this codebase: the ping that
// creates them (VisitorPingBeacon.tsx) fires automatically on every
// storefront page load, not on a deliberate user action — so a client that
// never retains the guest-id cookie (a crawler, a strict-privacy browser, a
// cookie-blocking extension) mints a brand-new guest identity, and
// therefore a brand-new row in each table, on every single ping.
const VISIT_RETENTION_DAYS = 90;

// Self-rescheduled from server.ts, same pattern as its FINA-sync timer —
// run once a day; failures are logged there and simply retried on the next
// tick rather than surfaced anywhere else, since this is maintenance, not a
// user-facing operation.
export async function pruneStaleVisitorData(): Promise<{ presenceDeleted: number; visitsDeleted: number }> {
  const presenceCutoff = new Date(Date.now() - PRESENCE_RETENTION_MS);
  const visitCutoff = shiftDateOnly(toTbilisiDateOnly(new Date()), -VISIT_RETENTION_DAYS);

  const [presenceDeleted, visitsDeleted] = await Promise.all([
    visitorsRepository.deleteStalePresence(presenceCutoff),
    visitorsRepository.deleteOldVisits(visitCutoff),
  ]);

  return { presenceDeleted, visitsDeleted };
}

function visitorKey(row: { userId: number | null; guestId: string | null }): string {
  return row.userId != null ? `user:${row.userId}` : `guest:${row.guestId}`;
}

// Admin "active users / visitors" overview — activeNow is a live heartbeat
// count, while todayVisitors/weekVisitors/dailySeries come from the bounded
// daily-visit log (see VisitorVisit's model comment): each row already
// represents one unique visitor for one day, so counting rows per day needs
// no further de-duplication, and the week figure de-duplicates visitor
// identity *across* those same rows instead of summing the daily counts
// (which would double-count a visitor active on multiple days that week).
export async function getVisitorOverview() {
  const activeSince = new Date(Date.now() - ACTIVE_WINDOW_MS);
  const today = toTbilisiDateOnly(new Date());
  const weekStart = shiftDateOnly(today, -(WEEK_WINDOW_DAYS - 1));

  const [activeNow, weekRows] = await Promise.all([
    visitorsRepository.countActiveSince(activeSince),
    visitorsRepository.findVisitsInRange(weekStart, today),
  ]);

  const countsByDay = new Map<string, number>();
  const uniqueThisWeek = new Set<string>();
  for (const row of weekRows) {
    countsByDay.set(row.date, (countsByDay.get(row.date) ?? 0) + 1);
    uniqueThisWeek.add(visitorKey(row));
  }

  // Zero-filled day series between weekStart/today (inclusive) — a chart
  // shouldn't skip days with no visitors, same reasoning as
  // analytics.service.ts's buildRevenueSeries.
  const dailySeries: { date: string; visitors: number }[] = [];
  let cursor = weekStart;
  while (cursor <= today) {
    dailySeries.push({ date: cursor, visitors: countsByDay.get(cursor) ?? 0 });
    cursor = shiftDateOnly(cursor, 1);
  }

  return {
    activeNow,
    todayVisitors: countsByDay.get(today) ?? 0,
    weekVisitors: uniqueThisWeek.size,
    dailySeries,
  };
}
