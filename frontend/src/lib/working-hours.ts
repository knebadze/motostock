import type { CompanyWorkingHour, WeekDay } from "./api/company-info";

const WEEK_ORDER: WeekDay[] = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY",
];

export type WorkingHoursGroup = {
  firstDay: WeekDay;
  lastDay: WeekDay;
  isClosed: boolean;
  openTime: string | null;
  closeTime: string | null;
};

// Walks Monday->Sunday and merges consecutive days that share the exact
// same schedule into one range (e.g. Mon-Sat 10:00-19:00, Sun closed)
// instead of listing all 7 days individually — used by the Footer's
// compact summary (the full day-by-day list stays on /contact).
export function groupWorkingHours(hours: CompanyWorkingHour[]): WorkingHoursGroup[] {
  const byDay = new Map(hours.map((hour) => [hour.dayOfWeek, hour]));
  const groups: WorkingHoursGroup[] = [];

  for (const day of WEEK_ORDER) {
    const entry = byDay.get(day);
    if (!entry) continue;

    const last = groups[groups.length - 1];
    const sameSchedule =
      last != null &&
      last.isClosed === entry.isClosed &&
      last.openTime === entry.openTime &&
      last.closeTime === entry.closeTime;

    if (sameSchedule) {
      last.lastDay = day;
    } else {
      groups.push({
        firstDay: day,
        lastDay: day,
        isClosed: entry.isClosed,
        openTime: entry.openTime,
        closeTime: entry.closeTime,
      });
    }
  }

  return groups;
}
