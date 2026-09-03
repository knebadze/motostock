import crypto from "node:crypto";
import { env } from "../../config/env.js";

export class VinDecodeApiError extends Error {}

export type VinDecodeResult = {
  year: number | null;
  engineVolumeCc: number | null;
  enginePowerHp: number | null;
};

// A technical/reliability constant, not a business-tunable one (same class
// as mailer.ts's SMTP_*_TIMEOUT_MS) — bounds how long a single provider
// call can hang before vin-decode.service.ts's fallback gets a chance to
// try the other provider, instead of the request just hanging on a slow or
// unreachable upstream.
const VIN_DECODE_TIMEOUT_MS = 8000;

function firstNumber(value: string | undefined | null): number | null {
  if (!value) return null;
  const match = value.match(/[\d.]+/);
  if (!match) return null;
  const parsed = Number(match[0]);
  return Number.isFinite(parsed) ? Math.round(parsed) : null;
}

// NHTSA vPIC — free, no API key required, but only reliably decodes vehicles
// sold/imported into the US, so coverage for this site's mostly-imported
// motorcycle/ATV inventory is limited. Kept as the always-available option.
export async function decodeViaNhtsa(vin: string): Promise<VinDecodeResult> {
  let body: { Results?: Array<Record<string, string>> };
  try {
    const res = await fetch(
      `https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValuesExtended/${encodeURIComponent(vin)}?format=json`,
      { signal: AbortSignal.timeout(VIN_DECODE_TIMEOUT_MS) },
    );
    if (!res.ok) {
      throw new VinDecodeApiError(`NHTSA API-ის მოთხოვნა ვერ შესრულდა (${res.status})`);
    }
    body = (await res.json()) as { Results?: Array<Record<string, string>> };
  } catch (err) {
    // Catches everything a fetch/parse can throw — network failure, DNS,
    // the AbortSignal.timeout above firing, or malformed JSON — and folds
    // it into the one error type vin-decode.service.ts's fallback loop
    // knows how to catch and move past. Without this, any of those raised
    // a raw, unwrapped error that skipped the fallback entirely.
    if (err instanceof VinDecodeApiError) throw err;
    const message = err instanceof Error ? err.message : String(err);
    throw new VinDecodeApiError(`NHTSA API-სთან დაკავშირება ვერ მოხერხდა: ${message}`);
  }

  const result = body.Results?.[0] ?? {};

  return {
    year: firstNumber(result.ModelYear),
    engineVolumeCc: firstNumber(result.DisplacementCC),
    enginePowerHp: firstNumber(result.EngineHP),
  };
}

export function isVincarioConfigured(): boolean {
  return Boolean(env.VINCARIO_API_KEY && env.VINCARIO_SECRET_KEY);
}

function vincarioControlSum(vin: string, id: string): string {
  const raw = `${vin}|${id}|${env.VINCARIO_API_KEY}|${env.VINCARIO_SECRET_KEY}`;
  return crypto.createHash("sha1").update(raw).digest("hex").substring(0, 10);
}

type VincarioDecodeItem = { label: string; value: string };

function findVincarioValue(
  items: VincarioDecodeItem[],
  ...labelSubstrings: string[]
): string | undefined {
  const item = items.find((entry) =>
    labelSubstrings.some((substring) => entry.label.toLowerCase().includes(substring)),
  );
  return item?.value;
}

// Vincario (api.vindecoder.eu) — paid beyond a small free monthly quota, but
// explicitly covers motorcycles/ATVs/quads globally rather than just
// US-market vehicles, which fits this site's inventory far better than
// NHTSA. Request signing per Vincario's documented scheme: base URL +
// apiKey + a SHA1 control sum of "{vin}|decode|{apiKey}|{secretKey}".
export async function decodeViaVincario(vin: string): Promise<VinDecodeResult> {
  if (!isVincarioConfigured()) {
    throw new VinDecodeApiError("Vincario API არ არის კონფიგურირებული");
  }

  const baseUrl = env.VINCARIO_BASE_URL ?? "https://api.vindecoder.eu/3.2";
  const controlSum = vincarioControlSum(vin, "decode");
  const url = `${baseUrl}/${env.VINCARIO_API_KEY}/${controlSum}/decode/${encodeURIComponent(vin)}.json`;

  let body: { decode?: VincarioDecodeItem[]; error?: string };
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(VIN_DECODE_TIMEOUT_MS) });
    if (!res.ok) {
      throw new VinDecodeApiError(`Vincario API-ის მოთხოვნა ვერ შესრულდა (${res.status})`);
    }
    body = (await res.json()) as { decode?: VincarioDecodeItem[]; error?: string };
  } catch (err) {
    // Same reasoning as decodeViaNhtsa's catch above.
    if (err instanceof VinDecodeApiError) throw err;
    const message = err instanceof Error ? err.message : String(err);
    throw new VinDecodeApiError(`Vincario API-სთან დაკავშირება ვერ მოხერხდა: ${message}`);
  }
  if (body.error) {
    throw new VinDecodeApiError(`Vincario API-ის შეცდომა: ${body.error}`);
  }

  const items = body.decode ?? [];
  return {
    year: firstNumber(findVincarioValue(items, "model year", "year")),
    engineVolumeCc: firstNumber(findVincarioValue(items, "displacement")),
    enginePowerHp: firstNumber(findVincarioValue(items, "power")),
  };
}
