import { z } from "zod";

// Guest-facing form — messages come from the caller's `t()` rather than
// being hardcoded, same convention as lib/validation/auth.ts.
export function createAddressFormSchema(t: (key: string) => string) {
  return z.object({
    phone: z.string().trim().min(9, t("phoneError")).max(20, t("phoneError")),
    cityId: z.string().trim().min(1, t("cityRequiredError")),
    street: z.string().trim().min(1, t("streetRequiredError")).max(200, t("streetRequiredError")),
    building: z.string().trim().max(50, t("buildingTooLongError")).optional(),
    apartment: z.string().trim().max(50, t("apartmentTooLongError")).optional(),
    postalCode: z.string().trim().max(20, t("postalCodeTooLongError")).optional(),
  });
}
export type AddressFormValues = z.infer<ReturnType<typeof createAddressFormSchema>>;
