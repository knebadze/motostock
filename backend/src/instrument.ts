// Must be the very first import in server.ts — Sentry's Node SDK has to
// initialize before the rest of the app (Express, HTTP, Prisma) is loaded.
// A no-op while SENTRY_DSN is unset. See lib/sentry.ts.
import { initSentry } from "./lib/sentry.js";

initSentry();
