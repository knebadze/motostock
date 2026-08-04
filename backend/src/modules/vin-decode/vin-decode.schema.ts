import { z } from "zod";
import { registry } from "../../docs/registry.js";

// Standard VIN shape — 17 characters, uppercase alphanumeric, excluding
// I/O/Q (never used in real VINs, to avoid confusion with 1/0).
export const decodeVinSchema = registry.register(
  "DecodeVinInput",
  z.object({
    vin: z
      .string()
      .trim()
      .toUpperCase()
      .regex(
        /^[A-HJ-NPR-Z0-9]{17}$/,
        "VIN კოდი უნდა შედგებოდეს 17 სიმბოლოსგან (I, O, Q გამოირიცხება)",
      ),
  }),
);
export type DecodeVinInput = z.infer<typeof decodeVinSchema>;

export const vinDecodeResultSchema = registry.register(
  "VinDecodeResult",
  z.object({
    year: z.int().nullable(),
    engineVolumeCc: z.int().nullable(),
    enginePowerHp: z.int().nullable(),
  }),
);
