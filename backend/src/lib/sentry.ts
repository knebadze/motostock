import * as Sentry from "@sentry/node";
import { env } from "../config/env.js";
import type { LoggedError } from "./error-hooks.js";

// Sentry error monitoring — two independent switches, both required:
//   1. SENTRY_DSN in the environment (the project key — never stored in the
//      DB, same rule as every other credential; see config/env.ts), checked
//      once at startup: without it Sentry is never even initialized.
//   2. The admin Settings → "მონიტორინგი" toggle, checked on every event in
//      beforeSend: switching it off stops reporting immediately, no restart.
// Errors reach Sentry through the same path that fills the admin ErrorLog:
// every logger.error(...) call (lib/logger.ts → lib/error-hooks.ts), which
// covers both request 500s (error.middleware.ts) and background failures.

let initialized = false;

export function isSentryConfigured(): boolean {
  return Boolean(env.SENTRY_DSN);
}

// Never sent: auth cookies/headers, and any context field whose name says
// it's a credential or personal contact data (e.g. the WhatsApp relay's
// `to` phone number is logged under such keys).
const SENSITIVE_KEY = /pass(word)?|secret|token|cookie|authorization|phone|email|^to$|address/i;

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

// Called first thing on startup (src/instrument.ts).
const URL_SECRET_PARAM = /([?&](?:token|code|state)=)[^&#\s"]*/gi;

function redactUrlSecrets(value: string): string {
  return value.replace(URL_SECRET_PARAM, "$1[REDACTED]");
}

export function initSentry(): void {
  if (!env.SENTRY_DSN || initialized) return;

  Sentry.init({
    dsn: env.SENTRY_DSN,
    environment: env.SENTRY_ENVIRONMENT ?? env.NODE_ENV,
    release: env.SENTRY_RELEASE,
    // Collect as little as possible automatically: no user info, no
    // cookies, no request/response bodies (checkout payloads carry names,
    // phones, addresses), no auth headers. beforeSend scrubs the rest.
    dataCollection: {
      userInfo: false,
      cookies: false,
      httpHeaders: { request: { deny: ["authorization", "cookie"] }, response: false },
      httpBodies: [],
    },
    // Errors only. tracesSampleRate is deliberately NOT set: per the SDK,
    // any value — even 0 — turns tracing on (just unsampled); leaving it
    // undefined keeps tracing fully off, so no per-request span overhead.
    async beforeSend(event) {
      // Imported lazily: settings.service pulls in prisma and half the app,
      // which mustn't load before Sentry.init (see instrument.ts).
      const { isSentryEnabled } = await import("../modules/settings/settings.service.js");
      const enabled = await isSentryEnabled().catch(() => false);
      if (!enabled) return null;

      if (event.request) {
        delete event.request.cookies;
        if (event.request.headers) {
          event.request.headers = scrub(event.request.headers) as Record<string, string>;
        }
        event.request.data = scrub(event.request.data);
        // One-time tokens (and OAuth code/state) in the URL — see the
        // frontend's lib/sentry-shared.ts.
        if (event.request.url) event.request.url = redactUrlSecrets(event.request.url);
        if (typeof event.request.query_string === "string") {
          event.request.query_string = redactUrlSecrets(`?${event.request.query_string}`);
        }
      }
      if (event.extra) event.extra = scrub(event.extra) as Record<string, unknown>;
      return event;
    },
  });
  initialized = true;
}

// lib/error-hooks.ts subscriber (registered in server.ts).
export function captureLoggedError({ message, context, error }: LoggedError): void {
  if (!initialized) return;
  Sentry.captureException(error ?? new Error(message), {
    extra: context ?? undefined,
    // Keep the human log message alongside the exception's own message
    // (e.g. "Scheduled FINA sync failed" + the underlying fetch error).
    tags: error && message !== error.message ? { logMessage: message.slice(0, 200) } : undefined,
  });
}

// Admin "send test event" button — true when the event was handed to the SDK
// (whether it's actually delivered still depends on the admin toggle).
export function captureTestEvent(): boolean {
  if (!initialized) return false;
  Sentry.captureException(new Error("Motostock Sentry test event (sent from admin settings)"));
  return true;
}

// Graceful shutdown — give queued events a moment to leave before exit.
export async function flushSentry(timeoutMs: number): Promise<void> {
  if (!initialized) return;
  await Sentry.flush(timeoutMs).catch(() => undefined);
}
