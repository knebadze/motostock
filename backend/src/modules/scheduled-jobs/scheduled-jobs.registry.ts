import { pruneStaleVisitorData } from "../visitors/visitors.service.js";
import { pruneStaleAuthArtifacts } from "../auth/auth.service.js";
import { pruneStaleGuestProductViews } from "../product-views/product-views.service.js";
import { pruneStaleGuestVehicleListingViews } from "../vehicle-listing-views/vehicle-listing-views.service.js";
import { pruneOrphanedRichTextImages } from "../media/media.service.js";
import { fetchNbgUsdToGelRate } from "../vehicle-listing/exchange-rate.service.js";
import { sendBirthdayEmails } from "../users/birthday-email.service.js";
import { pruneOldErrorLogs } from "../error-logs/error-logs.service.js";
import { pruneOldAuthEvents } from "../fraud/fraud.service.js";
import { pruneStaleGuestCollections } from "./guest-collections-prune.js";
import type { ScheduledJobKey } from "./scheduled-jobs.schema.js";

// number for count-style detail (every existing prune job), string for
// FETCH_USD_GEL_RATE's fetched-date value.
export type JobResult = { itemsAffected: number; detail?: Record<string, number | string> };

// The fallback slot for a job with no explicit `cron` below (currently none
// — every job now sets its own, staggered a couple minutes apart starting
// here, so they don't all fire in the same instant and open a burst of DB
// connections at once; see each job's own `cron` comment). Kept as a real
// fallback (not deleted) since server.ts and scheduled-jobs.service.ts both
// still read `job.cron ?? DEFAULT_JOB_CRON` — a job added later without its
// own `cron` lands here.
export const DEFAULT_JOB_CRON = "0 3 * * *";

export type JobDefinition = {
  key: ScheduledJobKey;
  labelKa: string;
  run: () => Promise<JobResult>;
  // Asia/Tbilisi cron expression, defaults to DEFAULT_JOB_CRON (03:00) — see
  // BIRTHDAY_EMAIL below for why a job would override it.
  cron?: string;
};

// Derives the admin-facing "ყოველდღე HH:MM (თბილისის დრო)" label straight
// from a job's own `cron` field instead of a second, separately-maintained
// label string — the two drifting apart (schedule changed, label forgotten)
// is exactly the bug this replaces. Every job here uses the simple daily
// "M H * * *" shape; a job with a genuinely different cadence would need a
// richer formatter, but none exists yet.
export function formatCronScheduleLabel(cronExpression: string): string {
  const [minute, hour] = cronExpression.split(" ");
  const pad = (value: string) => value.padStart(2, "0");
  return `ყოველდღე ${pad(hour)}:${pad(minute)} (თბილისის დრო)`;
}

// Wires each existing prune function (none of them changed — see
// server.ts's old runDailyPrune) into the common { itemsAffected, detail }
// shape scheduled-jobs.service.ts persists. The 4 different return shapes
// (a plain count, or a named-counts object) are normalized here rather than
// changing any of those functions' own signatures.
export const JOB_DEFINITIONS: JobDefinition[] = [
  {
    key: "DAILY_PRUNE_VISITOR_DATA",
    labelKa: "ვიზიტორთა მონაცემების გასუფთავება",
    // Base slot — every other prune/fetch job below is offset a couple
    // minutes past this one (see DEFAULT_JOB_CRON's comment).
    cron: "0 3 * * *",
    run: async () => {
      const { presenceDeleted, visitsDeleted } = await pruneStaleVisitorData();
      return { itemsAffected: presenceDeleted + visitsDeleted, detail: { presenceDeleted, visitsDeleted } };
    },
  },
  {
    key: "DAILY_PRUNE_AUTH_ARTIFACTS",
    labelKa: "სესიების და ტოკენების გასუფთავება",
    cron: "2 3 * * *",
    run: async () => {
      const { sessionsDeleted, passwordResetTokensDeleted, emailVerificationTokensDeleted } =
        await pruneStaleAuthArtifacts();
      return {
        itemsAffected: sessionsDeleted + passwordResetTokensDeleted + emailVerificationTokensDeleted,
        detail: { sessionsDeleted, passwordResetTokensDeleted, emailVerificationTokensDeleted },
      };
    },
  },
  {
    key: "DAILY_PRUNE_GUEST_PRODUCT_VIEWS",
    labelKa: "სტუმრების პროდუქტის ნახვების გასუფთავება",
    cron: "4 3 * * *",
    run: async () => ({ itemsAffected: await pruneStaleGuestProductViews() }),
  },
  {
    key: "DAILY_PRUNE_GUEST_VEHICLE_LISTING_VIEWS",
    labelKa: "სტუმრების ტექნიკის განცხადებების ნახვების გასუფთავება",
    cron: "6 3 * * *",
    run: async () => ({ itemsAffected: await pruneStaleGuestVehicleListingViews() }),
  },
  {
    key: "FETCH_USD_GEL_RATE",
    labelKa: "USD/GEL კურსის განახლება (ეროვნული ბანკი)",
    cron: "8 3 * * *",
    run: async () => {
      const { rate, fetchedAt } = await fetchNbgUsdToGelRate();
      return { itemsAffected: 1, detail: { rate, fetchedAt: fetchedAt.toISOString() } };
    },
  },
  {
    key: "DAILY_PRUNE_RICH_TEXT_IMAGES",
    labelKa: "მიტოვებული სურათების გასუფთავება",
    // Last and furthest offset — this is the one genuinely heavier job here
    // (full-table scans across Product/VehicleCatalog/VehicleListing/Faq/
    // EmailTemplate description columns, see media.service.ts's
    // pruneOrphanedRichTextImages), so it runs after every lighter indexed
    // delete above has already finished.
    cron: "10 3 * * *",
    run: async () => ({ itemsAffected: await pruneOrphanedRichTextImages() }),
  },
  {
    key: "DAILY_PRUNE_ERROR_LOGS",
    labelKa: "შეცდომების ლოგის გასუფთავება (30 დღეზე ძველი)",
    // Light indexed delete (ErrorLog.createdAt) — slotted after the heavier
    // rich-text scan above rather than squeezed between the others.
    cron: "12 3 * * *",
    run: async () => ({ itemsAffected: await pruneOldErrorLogs() }),
  },
  {
    key: "DAILY_PRUNE_GUEST_COLLECTIONS",
    labelKa: "სტუმრების მიტოვებული კალათის, სურვილებისა და შედარების გასუფთავება",
    cron: "14 3 * * *",
    run: async () => {
      const { cartDeleted, wishlistDeleted, compareDeleted } = await pruneStaleGuestCollections();
      return {
        itemsAffected: cartDeleted + wishlistDeleted + compareDeleted,
        detail: { cartDeleted, wishlistDeleted, compareDeleted },
      };
    },
  },
  {
    key: "DAILY_PRUNE_AUTH_EVENTS",
    labelKa: "შესვლის ისტორიის გასუფთავება (180 დღეზე ძველი)",
    cron: "16 3 * * *",
    run: async () => ({ itemsAffected: await pruneOldAuthEvents() }),
  },
  {
    key: "BIRTHDAY_EMAIL",
    labelKa: "დაბადების დღის მილოცვების გაგზავნა",
    // Noon, not the shared 03:00 slot — nobody wants a birthday email at
    // 3am, unlike the other jobs here, which are invisible maintenance
    // (prune/rate-fetch) that nobody's waiting on.
    cron: "0 12 * * *",
    run: async () => {
      const { sentCount, skipped } = await sendBirthdayEmails();
      return { itemsAffected: sentCount, detail: { skipped: skipped ? "already sent today" : "no" } };
    },
  },
];
