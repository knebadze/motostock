import { pruneStaleVisitorData } from "../visitors/visitors.service.js";
import { pruneStaleAuthArtifacts } from "../auth/auth.service.js";
import { pruneStaleGuestProductViews } from "../product-views/product-views.service.js";
import { pruneStaleGuestVehicleListingViews } from "../vehicle-listing-views/vehicle-listing-views.service.js";
import { pruneOrphanedRichTextImages } from "../media/media.service.js";
import type { ScheduledJobKey } from "./scheduled-jobs.schema.js";

export type JobResult = { itemsAffected: number; detail?: Record<string, number> };

export type JobDefinition = {
  key: ScheduledJobKey;
  labelKa: string;
  run: () => Promise<JobResult>;
};

// Wires each existing prune function (none of them changed — see
// server.ts's old runDailyPrune) into the common { itemsAffected, detail }
// shape scheduled-jobs.service.ts persists. The 4 different return shapes
// (a plain count, or a named-counts object) are normalized here rather than
// changing any of those functions' own signatures.
export const JOB_DEFINITIONS: JobDefinition[] = [
  {
    key: "DAILY_PRUNE_VISITOR_DATA",
    labelKa: "ვიზიტორთა მონაცემების გასუფთავება",
    run: async () => {
      const { presenceDeleted, visitsDeleted } = await pruneStaleVisitorData();
      return { itemsAffected: presenceDeleted + visitsDeleted, detail: { presenceDeleted, visitsDeleted } };
    },
  },
  {
    key: "DAILY_PRUNE_AUTH_ARTIFACTS",
    labelKa: "სესიების და ტოკენების გასუფთავება",
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
    run: async () => ({ itemsAffected: await pruneStaleGuestProductViews() }),
  },
  {
    key: "DAILY_PRUNE_GUEST_VEHICLE_LISTING_VIEWS",
    labelKa: "სტუმრების ტექნიკის განცხადებების ნახვების გასუფთავება",
    run: async () => ({ itemsAffected: await pruneStaleGuestVehicleListingViews() }),
  },
  {
    key: "DAILY_PRUNE_RICH_TEXT_IMAGES",
    labelKa: "მიტოვებული სურათების გასუფთავება",
    run: async () => ({ itemsAffected: await pruneOrphanedRichTextImages() }),
  },
];
