import { getSentryEnabledFromServer } from "@/lib/api/server";
import { SENTRY_DSN, SENTRY_FLAG_META_NAME } from "@/lib/sentry-shared";

// Tells the browser-side Sentry SDK (instrumentation-client.ts) whether the
// admin has reporting switched on — read per event, so no rebuild needed.
// React hoists <meta> into <head>. Renders nothing when Sentry isn't built
// in (no NEXT_PUBLIC_SENTRY_DSN), so no extra request in that case.
export async function SentryFlagMeta() {
  if (!SENTRY_DSN) return null;
  const enabled = await getSentryEnabledFromServer();
  return <meta name={SENTRY_FLAG_META_NAME} content={enabled ? "on" : "off"} />;
}
