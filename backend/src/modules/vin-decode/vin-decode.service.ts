import { ApiError } from "../../lib/ApiError.js";
import { getVinDecodeProvider, isVinDecodeEnabled } from "../settings/settings.service.js";
import { decodeViaNhtsa, decodeViaVincario, VinDecodeApiError } from "./vin-decode.providers.js";
import type { DecodeVinInput } from "./vin-decode.schema.js";

export async function decodeVin(input: DecodeVinInput) {
  if (!(await isVinDecodeEnabled())) {
    throw new ApiError(400, "VIN კოდით შევსების ფუნქცია გამორთულია");
  }

  const provider = await getVinDecodeProvider();

  try {
    return provider === "vincario"
      ? await decodeViaVincario(input.vin)
      : await decodeViaNhtsa(input.vin);
  } catch (error) {
    if (error instanceof VinDecodeApiError) {
      throw new ApiError(502, error.message);
    }
    throw error;
  }
}
