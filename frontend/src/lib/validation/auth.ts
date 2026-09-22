import { z } from "zod";

const MIN_AGE_YEARS = 16;

// Guest-facing forms are fully trilingual (unlike the admin panel's
// Georgian-only validation schemas in this folder), so error messages come
// from the caller's `t()` instead of being hardcoded here.
export function createRegisterFormSchema(t: (key: string) => string) {
  return z
    .object({
      firstName: z.string().trim().min(2, t("firstNameError")).max(50, t("firstNameError")),
      lastName: z.string().trim().min(2, t("lastNameError")).max(50, t("lastNameError")),
      email: z
        .string()
        .trim()
        .min(1, t("emailRequiredError"))
        .email(t("emailInvalidError")),
      password: z.string().min(8, t("passwordTooShortError")).max(100, t("passwordTooShortError")),
      confirmPassword: z.string().min(1, t("confirmPasswordRequiredError")),
      // Also the walk-in-customer auto-merge key on the backend — see
      // auth.service.ts's registerUser.
      phone: z.string().trim().min(9, t("phoneError")).max(20, t("phoneError")),
      dateOfBirth: z
        .string()
        .min(1, t("dateOfBirthError"))
        .refine((value) => {
          const dob = new Date(value);
          if (Number.isNaN(dob.getTime())) return false;
          const minBirthDate = new Date();
          minBirthDate.setFullYear(minBirthDate.getFullYear() - MIN_AGE_YEARS);
          return dob <= minBirthDate;
        }, t("dateOfBirthError")),
      agreedToTerms: z.literal(true, { error: t("termsRequiredError") }),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: t("passwordMismatch"),
      path: ["confirmPassword"],
    });
}
export type RegisterFormValues = z.infer<ReturnType<typeof createRegisterFormSchema>>;
