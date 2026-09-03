import { ApiError } from "../../lib/ApiError.js";
import { getVinDecodeProvider, isVinDecodeEnabled } from "../settings/settings.service.js";
import {
  decodeViaNhtsa,
  decodeViaVincario,
  isVincarioConfigured,
  VinDecodeApiError,
  type VinDecodeResult,
} from "./vin-decode.providers.js";
import type { DecodeVinInput } from "./vin-decode.schema.js";

export async function decodeVin(input: DecodeVinInput) {
  if (!(await isVinDecodeEnabled())) {
    throw new ApiError(400, "VIN კოდით შევსების ფუნქცია გამორთულია", "VIN_DECODE_DISABLED");
  }

  const primary = await getVinDecodeProvider();

  // Try the admin-configured primary first, then fall back to whichever
  // provider it isn't — but only a provider that's actually usable (NHTSA
  // always is; Vincario only once its keys are configured). Each provider
  // call is itself timeout-bounded (see vin-decode.providers.ts), so one
  // slow/unreachable/erroring source no longer fails the whole request (or
  // hangs it) when a second source could still answer.
  const providers: Array<() => Promise<VinDecodeResult>> =
    primary === "vincario"
      ? [() => decodeViaVincario(input.vin), () => decodeViaNhtsa(input.vin)]
      : [
          () => decodeViaNhtsa(input.vin),
          ...(isVincarioConfigured() ? [() => decodeViaVincario(input.vin)] : []),
        ];

  let lastError = new VinDecodeApiError("VIN decode provider unavailable");
  for (const run of providers) {
    try {
      return await run();
    } catch (error) {
      if (!(error instanceof VinDecodeApiError)) throw error;
      lastError = error;
    }
  }

  // The underlying provider's own message is dynamic/unpredictable (and
  // often English or a raw upstream string) — not worth threading through
  // as a translation param, so this always maps to one generic
  // Errors.VIN_DECODE_FAILED message regardless of what the provider(s)
  // actually said (still logged/kept in `message`, from whichever provider
  // failed last, for debugging).
  throw new ApiError(502, lastError.message, "VIN_DECODE_FAILED");
}
