import * as Sentry from "@sentry/nextjs";
import { SENTRY_DATA_COLLECTION, SENTRY_DSN, SENTRY_ENVIRONMENT, SENTRY_FLAG_META_NAME, scrubEvent } from "@/lib/sentry-shared";

// Browser-side Sentry (Next.js loads this before the app hydrates). No-op
// without NEXT_PUBLIC_SENTRY_DSN; events are dropped unless the admin toggle
// is on — see lib/sentry-shared.ts.
if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: SENTRY_ENVIRONMENT,
    // Errors only — no tracing (tracesSampleRate left undefined: any value,
    // even 0, would turn it on) and no session replay.
    dataCollection: SENTRY_DATA_COLLECTION,
    beforeSend(event) {
      const flag = document.querySelector(`meta[name="${SENTRY_FLAG_META_NAME}"]`)?.getAttribute("content");
      return flag === "on" ? scrubEvent(event) : null;
    },
  });
}
