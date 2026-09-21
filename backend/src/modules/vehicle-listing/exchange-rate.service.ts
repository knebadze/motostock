import { logger } from "../../lib/logger.js";
import { setUsdToGelRate } from "../settings/settings.service.js";

// Fallback/current source — a free, no-key, no-bot-protection currency API
// (aggregates market rates, not literally NBG's own published figure, but
// within ~0.1% of it in practice). Reliable in testing (no redirect/JS
// challenges), unlike NBG's own public site (see below).
const FALLBACK_RATES_URL = "https://open.er-api.com/v6/latest/USD";
const REQUEST_TIMEOUT_MS = 8000;

// ---- Bank of Georgia's official NBG-rate-mirror endpoint (preferred, not
// yet wired up) ----
//
// api.bog.ge's developer platform exposes `GET api/rates/nbg/{currency}`,
// which mirrors the National Bank of Georgia's own published rate exactly —
// unlike the market-aggregator fallback below. NBG's own public site
// (nbg.gov.ge) is unusable directly: it's behind an F5 Bot Defense
// JavaScript challenge that no plain server-side HTTP client (this
// backend's global `fetch`, curl, etc.) can pass — confirmed by repeated
// testing, not a bug in this code.
//
// Bank of Georgia's endpoint requires registering a developer account and
// obtaining OAuth2-style credentials through their Business Manager portal
// — the same "blocked on real bank API docs/credentials" status as this
// codebase's TBC/BOG payment-gateway integration (see that plan's memory
// note). Writing the actual token-exchange/request code here before those
// credentials and the real auth spec exist would be guaranteed-wrong,
// fabricated integration code — so this is deliberately left unimplemented
// until Phase B of the payment gateway work supplies real BOG credentials,
// at which point this should become the primary source (env vars mirroring
// FINA_*/WHATSAPP_*'s per-provider-prefix convention in config/env.ts),
// with the fallback below kept as the safety net if that call ever fails.

type FallbackRatesResponse = { result: string; rates: Record<string, number> };

async function fetchFallbackUsdToGelRate(): Promise<number> {
  const res = await fetch(FALLBACK_RATES_URL, {
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  if (!res.ok) {
    throw new Error(`გარეშე კურსის API-მ დააბრუნა სტატუსი ${res.status}`);
  }

  const body = (await res.json()) as FallbackRatesResponse;
  const rate = body.rates?.GEL;
  if (typeof rate !== "number") {
    throw new Error("გარეშე კურსის API-ს პასუხში GEL კურსი ვერ მოიძებნა");
  }
  return rate;
}

// Fetches today's USD/GEL rate and persists it via settings.service.ts's
// setUsdToGelRate. Called by the FETCH_USD_GEL_RATE scheduled job
// (scheduled-jobs.registry.ts) — allowed to throw on a fetch/parse problem
// (the caller, runScheduledJob, already records FAILED runs on a thrown
// error); a failed run just leaves yesterday's rate in place, since
// setUsdToGelRate is only called on success.
export async function fetchNbgUsdToGelRate(): Promise<{ rate: number; fetchedAt: Date }> {
  const rate = await fetchFallbackUsdToGelRate();

  const fetchedAt = new Date();
  await setUsdToGelRate(rate, fetchedAt);
  logger.info({ rate }, "USD/GEL rate fetched");
  return { rate, fetchedAt };
}
