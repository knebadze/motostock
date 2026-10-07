import type { ErrorEvent } from "@sentry/nextjs";

// Shared by instrumentation-client.ts (browser) and sentry.server.config.ts
// (Next.js server/SSR). Two independent switches, both required:
//   1. NEXT_PUBLIC_SENTRY_DSN at build time — unset means Sentry is never
//      initialized at all (it's inlined into the client bundle, so it has to
//      exist when `next build` runs; see frontend/Dockerfile).
//   2. The admin Settings → "მონიტორინგი" toggle (backend setting
//      sentry_enabled), checked per event — switching it off stops reporting
//      without a rebuild. The browser reads it from a <meta> tag the layouts
//      render (components/shared/SentryFlagMeta.tsx); the server fetches it.
export const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;
export const SENTRY_ENVIRONMENT = process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT ?? process.env.NODE_ENV;
export const SENTRY_FLAG_META_NAME = "motostock-sentry";

// Collect as little as possible automatically: no user info, no cookies,
// no request/response bodies (checkout forms carry names, phones,
// addresses), no auth headers. scrubEvent below covers the rest.
export const SENTRY_DATA_COLLECTION = {
  userInfo: false,
  cookies: false,
  httpHeaders: { request: { deny: ["authorization", "cookie"] }, response: false },
  httpBodies: [],
};

const SENSITIVE_KEY = /pass(word)?|secret|token|cookie|authorization|phone|email|address/i;

function scrub(value: unknown, depth = 0): unknown {
  if (depth > 6 || value == null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map((item) => scrub(item, depth + 1));
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, entry]) => [
      key,
      SENSITIVE_KEY.test(key) ? "[REDACTED]" : scrub(entry, depth + 1),
    ]),
  );
}

// One-time tokens travel in links (password reset, email verification,
// newsletter confirm/unsubscribe: ?token=…) — the page URL, query string and
// navigation/fetch breadcrumbs would otherwise carry a still-valid token
// into Sentry.
const URL_SECRET_PARAM = /([?&](?:token|code|state)=)[^&#\s"]*/gi;

export function redactUrlSecrets(value: string): string {
  return value.replace(URL_SECRET_PARAM, "$1[REDACTED]");
}

function redactStrings(value: unknown, depth = 0): unknown {
  if (typeof value === "string") return redactUrlSecrets(value);
  if (depth > 6 || value == null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map((item) => redactStrings(item, depth + 1));
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, entry]) => [key, redactStrings(entry, depth + 1)]),
  );
}

export function scrubEvent(event: ErrorEvent): ErrorEvent {
  if (event.request) {
    delete event.request.cookies;
    if (event.request.headers) event.request.headers = scrub(event.request.headers) as Record<string, string>;
    event.request.data = scrub(event.request.data);
    if (event.request.url) event.request.url = redactUrlSecrets(event.request.url);
    if (event.request.query_string) {
      event.request.query_string = redactStrings(
        typeof event.request.query_string === "string"
          ? `?${event.request.query_string}`
          : event.request.query_string,
      ) as typeof event.request.query_string;
    }
  }
  if (event.breadcrumbs) {
    event.breadcrumbs = event.breadcrumbs.map((crumb) => ({
      ...crumb,
      ...(crumb.message ? { message: redactUrlSecrets(crumb.message) } : {}),
      ...(crumb.data ? { data: redactStrings(crumb.data) as Record<string, unknown> } : {}),
    }));
  }
  if (event.extra) event.extra = scrub(event.extra) as Record<string, unknown>;
  return event;
}
