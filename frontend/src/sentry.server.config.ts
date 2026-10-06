import * as Sentry from "@sentry/nextjs";
import { getServerApiBaseUrl } from "@/lib/api/internal";
import { SENTRY_DATA_COLLECTION, SENTRY_DSN, SENTRY_ENVIRONMENT, scrubEvent } from "@/lib/sentry-shared";

// The admin toggle, re-read at most once a minute — this runs outside any
// React request scope, so a plain in-memory TTL instead of Next's caches.
const FLAG_TTL_MS = 60_000;
let flag: { enabled: boolean; fetchedAt: number } | null = null;

async function isSentryEnabled(): Promise<boolean> {
  if (flag && Date.now() - flag.fetchedAt < FLAG_TTL_MS) return flag.enabled;
  try {
    const response = await fetch(`${getServerApiBaseUrl()}/settings/monitoring-public`, {
      cache: "no-store",
      signal: AbortSignal.timeout(3_000),
    });
    const body = (await response.json()) as { sentryEnabled?: boolean };
    flag = { enabled: body.sentryEnabled === true, fetchedAt: Date.now() };
  } catch {
    // Backend unreachable: keep the last known value (default off).
    flag = { enabled: flag?.enabled ?? false, fetchedAt: Date.now() };
  }
  return flag.enabled;
}

// Next.js server-side Sentry (SSR, route handlers, proxy) — loaded from
// instrumentation.ts. Same two switches as the browser side.
if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: SENTRY_ENVIRONMENT,
    // Errors only — tracesSampleRate deliberately undefined (see
    // instrumentation-client.ts).
    dataCollection: SENTRY_DATA_COLLECTION,
    async beforeSend(event) {
      return (await isSentryEnabled()) ? scrubEvent(event) : null;
    },
  });
}
