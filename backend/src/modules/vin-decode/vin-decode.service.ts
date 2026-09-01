import { ApiError } from "../../lib/ApiError.js";
import { getVinDecodeProvider, isVinDecodeEnabled } from "../settings/settings.service.js";
import { decodeViaNhtsa, decodeViaVincario, VinDecodeApiError } from "./vin-decode.providers.js";
import type { DecodeVinInput } from "./vin-decode.schema.js";

export async function decodeVin(input: DecodeVinInput) {
  if (!(await isVinDecodeEnabled())) {
    throw new ApiError(400, "VIN კოდით შევსების ფუნქცია გამორთულია", "VIN_DECODE_DISABLED");
  }

  const provider = await getVinDecodeProvider();

  try {
    return provider === "vincario"
      ? await decodeViaVincario(input.vin)
      : await decodeViaNhtsa(input.vin);
  } catch (error) {
    if (error instanceof VinDecodeApiError) {
      // The underlying provider's own message is dynamic/unpredictable (and
      // often English or a raw upstream string) — not worth threading
      // through as a translation param, so this always maps to one generic
      // Errors.VIN_DECODE_FAILED message regardless of what the provider
      // actually said (still logged/kept in `message` for debugging).
      throw new ApiError(502, error.message, "VIN_DECODE_FAILED");
    }
    throw error;
  }
}
