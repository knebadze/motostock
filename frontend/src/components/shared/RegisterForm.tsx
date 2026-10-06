"use client";

import { useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Link, useRouter } from "@/i18n/navigation";
import { registerUser } from "@/lib/api/auth";
import { ApiRequestError } from "@/lib/api/client";
import { resolveApiErrorMessage } from "@/lib/api-errors";
import { OAuthButtons, type OAuthStatus } from "@/components/shared/OAuthButtons";
import { isSafeRedirectPath, resolveRedirectTarget } from "@/lib/auth-redirect";
import { PasswordInput } from "@/components/shared/PasswordInput";
import { DateInput } from "@/components/shared/DateInput";
import { FieldError } from "@/components/shared/FieldError";
import { toTbilisiDateOnly } from "@/lib/format";
import { TermsModal } from "@/components/shared/TermsModal";
import { createRegisterFormSchema } from "@/lib/validation/auth";
import { getFieldErrors, type FieldErrors } from "@/lib/validation/common";

export function RegisterForm({ oauthStatus }: { oauthStatus: OAuthStatus }) {
  const t = useTranslations("Auth");
  const tErrors = useTranslations("ApiErrors");
  const router = useRouter();
  // Same ?redirect= as LoginForm (its "register" link forwards it), so a
  // new shopper sent to log in from checkout lands back there after signing
  // up instead of on /account with the cart to find again.
  const searchParams = useSearchParams();
  const redirectParam = searchParams.get("redirect");
  const redirect = isSafeRedirectPath(redirectParam) ? redirectParam : null;
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [termsModalOpen, setTermsModalOpen] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    const schema = createRegisterFormSchema(t);
    const result = schema.safeParse({
      firstName,
      lastName,
      email,
      phone,
      dateOfBirth,
      password,
      confirmPassword,
      agreedToTerms,
    });
    if (!result.success) {
      setErrors(getFieldErrors(result.error));
      return;
    }
    setErrors({});

    setLoading(true);
    try {
      await registerUser(result.data);
      router.push(resolveRedirectTarget(redirect));
      router.refresh();
    } catch (error) {
      // The backend's auth error strings are English-only (no server-side
      // i18n for this yet) — map the one status code we know about to a
      // localized message instead of surfacing raw backend text.
      const message =
        error instanceof ApiRequestError && error.status === 409
          ? t("emailInUse")
          : resolveApiErrorMessage(error, tErrors, t("registerError"));
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="w-full max-w-sm rounded-2xl border border-border bg-card p-8 sm:max-w-xl"
    >
      <h1 className="text-xl font-bold tracking-tight">{t("registerTitle")}</h1>

      <div className="mt-6 flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="first-name" className="text-sm font-medium">
              {t("firstNameLabel")}
            </label>
            <input
              id="first-name"
              type="text"
              autoComplete="given-name"
              value={firstName}
              onChange={(event) => setFirstName(event.target.value)}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            />
            <FieldError message={errors.firstName} />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="last-name" className="text-sm font-medium">
              {t("lastNameLabel")}
            </label>
            <input
              id="last-name"
              type="text"
              autoComplete="family-name"
              value={lastName}
              onChange={(event) => setLastName(event.target.value)}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            />
            <FieldError message={errors.lastName} />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="email" className="text-sm font-medium">
              {t("emailLabel")}
            </label>
            <input
              id="email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            />
            <FieldError message={errors.email} />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="phone" className="text-sm font-medium">
              {t("phoneLabel")}
            </label>
            <input
              id="phone"
              type="tel"
              autoComplete="tel"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            />
            <FieldError message={errors.phone} />
          </div>

          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <label htmlFor="date-of-birth" className="text-sm font-medium">
              {t("dateOfBirthLabel")}
            </label>
            <DateInput
              id="date-of-birth"
              value={dateOfBirth}
              onChange={setDateOfBirth}
              max={toTbilisiDateOnly(new Date().toISOString())}
            />
            <FieldError message={errors.dateOfBirth} />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="password" className="text-sm font-medium">
              {t("passwordLabel")}
            </label>
            <PasswordInput
              id="password"
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
            <FieldError message={errors.password} />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="confirm-password" className="text-sm font-medium">
              {t("confirmPasswordLabel")}
            </label>
            <PasswordInput
              id="confirm-password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
            />
            <FieldError message={errors.confirmPassword} />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              checked={agreedToTerms}
              onChange={(event) => setAgreedToTerms(event.target.checked)}
              className="mt-0.5 size-4 shrink-0 rounded border-border text-primary-text focus:ring-primary"
            />
            <span>
              {t.rich("termsAgreement", {
                terms: (chunks) => (
                  <button
                    type="button"
                    onClick={(event) => {
                      // Without this, clicking the link (a label descendant)
                      // also forwards a synthetic click to the checkbox via
                      // the label's native behavior — this should only open
                      // the modal, not toggle agreement.
                      event.stopPropagation();
                      setTermsModalOpen(true);
                    }}
                    className="font-semibold text-primary-text hover:underline"
                  >
                    {chunks}
                  </button>
                ),
              })}
            </span>
          </label>
          <FieldError message={errors.agreedToTerms} />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="mt-2 rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover disabled:opacity-50"
        >
          {loading ? t("registerSubmitting") : t("registerSubmit")}
        </button>

        <OAuthButtons status={oauthStatus} redirect={redirect} />

        <p className="text-center text-sm text-muted-foreground">
          {t("haveAccount")}{" "}
          <Link href={{ pathname: "/login", query: redirect ? { redirect } : {} }} className="font-semibold text-primary-text hover:underline">
            {t("goToLogin")}
          </Link>
        </p>
      </div>

      <TermsModal open={termsModalOpen} onClose={() => setTermsModalOpen(false)} />
    </form>
  );
}
