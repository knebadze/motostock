import { z } from "zod";

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
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: t("passwordMismatch"),
      path: ["confirmPassword"],
    });
}
export type RegisterFormValues = z.infer<ReturnType<typeof createRegisterFormSchema>>;
