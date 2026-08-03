import { z } from "zod";
import { optionalIntString, requiredIntString } from "./common";

// Guest-facing form — messages come from the caller's `t()` rather than
// being hardcoded, same convention as lib/validation/address.ts.
export function createGarageCatalogPickFormSchema(t: (key: string) => string) {
  return z.object({
    vehicleCatalogId: z.string().trim().min(1, t("catalogRequiredError")),
    year: requiredIntString({ min: 1900, max: 2100, message: t("yearError") }),
  });
}
export type GarageCatalogPickFormValues = z.infer<
  ReturnType<typeof createGarageCatalogPickFormSchema>
>;

export function createGarageSubmitFormSchema(t: (key: string) => string) {
  return z.object({
    brandId: z.string().trim().min(1, t("brandRequiredError")),
    modelId: z.string().trim().min(1, t("modelRequiredError")),
    variant: z.string().trim().max(120, t("variantTooLongError")).optional(),
    year: requiredIntString({ min: 1900, max: 2100, message: t("yearError") }),
    engineVolumeCc: optionalIntString({ min: 1, message: t("engineVolumeError") }),
    enginePowerHp: optionalIntString({ min: 1, message: t("enginePowerError") }),
    fuelTypeId: z.string().trim().optional(),
    transmissionTypeId: z.string().trim().optional(),
  });
}
export type GarageSubmitFormValues = z.infer<ReturnType<typeof createGarageSubmitFormSchema>>;
