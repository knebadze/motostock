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
  return z
    .object({
      brandId: z.string().trim().min(1, t("brandRequiredError")),
      modelId: z.string().trim().min(1, t("modelRequiredError")),
      variant: z.string().trim().max(120, t("variantTooLongError")).optional(),
      // Model generation's release years — same meaning as the admin form's
      // yearFrom/yearTo, distinct from `year` below (the caller's own
      // vehicle's specific year, validated against this range).
      yearFrom: optionalIntString({ min: 1900, max: 2100, message: t("yearError") }),
      yearTo: optionalIntString({ min: 1900, max: 2100, message: t("yearError") }),
      year: requiredIntString({ min: 1900, max: 2100, message: t("yearError") }),
      engineVolumeCc: optionalIntString({ min: 1, message: t("engineVolumeError") }),
      enginePowerHp: optionalIntString({ min: 1, message: t("enginePowerError") }),
      fuelTypeId: z.string().trim().optional(),
      transmissionTypeId: z.string().trim().optional(),
    })
    .superRefine((data, ctx) => {
      const from = data.yearFrom.trim() === "" ? null : Number(data.yearFrom);
      const to = data.yearTo.trim() === "" ? null : Number(data.yearTo);
      if (from != null && to != null && from > to) {
        ctx.addIssue({ code: "custom", message: t("yearRangeError"), path: ["yearTo"] });
      }

      const year = Number(data.year);
      if ((from != null && year < from) || (to != null && year > to)) {
        ctx.addIssue({ code: "custom", message: t("yearOutOfRangeError"), path: ["year"] });
      }
    });
}
export type GarageSubmitFormValues = z.infer<ReturnType<typeof createGarageSubmitFormSchema>>;
