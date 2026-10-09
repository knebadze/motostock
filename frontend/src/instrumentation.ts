import * as Sentry from "@sentry/nextjs";

// Next.js instrumentation hook — loads server-side Sentry (a no-op without
// NEXT_PUBLIC_SENTRY_DSN; see sentry.server.config.ts). This app has no
// edge-runtime code (proxy.ts runs on Node), so there's no edge config.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }
}

// Reports errors thrown while rendering server components / route handlers.
export const onRequestError = Sentry.captureRequestError;
