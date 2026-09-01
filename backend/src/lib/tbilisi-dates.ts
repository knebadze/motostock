// Georgia has a single fixed UTC+4 offset year-round (no DST). Admin-entered
// discount/promo-code dates arrive as a bare "YYYY-MM-DD" (see z.iso.date()
// in the various discount/promo-code schemas) with no timezone of their
// own — parsing that directly via `new Date("2026-08-15")` treats it as UTC
// midnight, which is 04:00 in Tbilisi, not the start of that calendar day
// locally. The end of the same mistake: reading a stored instant back via
// `date.toISOString().slice(0, 10)` reports the UTC calendar date, which
// can differ from the Tbilisi calendar date near local midnight. Together
// these made discounts/promos expire (and admin-facing edit forms display)
// up to ~20 hours off from what "through Aug 15" actually means locally.
// Use startOfDayTbilisi/endOfDayTbilisi when turning an admin-entered date
// into a stored instant, and toTbilisiDateOnly when turning a stored instant
// back into the date-only string an admin form should show.
const TBILISI_UTC_OFFSET = "+04:00";
const TBILISI_OFFSET_MS = 4 * 60 * 60 * 1000;

export function startOfDayTbilisi(dateOnly: string): Date {
  return new Date(`${dateOnly}T00:00:00.000${TBILISI_UTC_OFFSET}`);
}

export function endOfDayTbilisi(dateOnly: string): Date {
  return new Date(`${dateOnly}T23:59:59.999${TBILISI_UTC_OFFSET}`);
}

export function toTbilisiDateOnly(date: Date): string {
  return new Date(date.getTime() + TBILISI_OFFSET_MS).toISOString().slice(0, 10);
}
