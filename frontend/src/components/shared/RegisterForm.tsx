"use client";

import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Link, useRouter } from "@/i18n/navigation";
import { registerUser } from "@/lib/api/auth";
import { ApiRequestError } from "@/lib/api/client";
import { OAuthButtons } from "@/components/shared/OAuthButtons";
import { PasswordInput } from "@/components/shared/PasswordInput";
import { FieldError } from "@/components/shared/FieldError";
import { TermsModal } from "@/components/shared/TermsModal";
import { createRegisterFormSchema } from "@/lib/validation/auth";
import { getFieldErrors, type FieldErrors } from "@/lib/validation/common";

export function RegisterForm() {
  const t = useTranslations("Auth");
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
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
      router.push("/account");
      router.refresh();
    } catch (error) {
      // The backend's auth error strings are English-only (no server-side
      // i18n for this yet) — map the one status code we know about to a
      // localized message instead of surfacing raw backend text.
      const message =
        error instanceof ApiRequestError
          ? error.status === 409
            ? t("emailInUse")
            : error.message
          : t("registerError");
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="w-full max-w-sm rounded-2xl border border-border bg-card p-8"
    >
      <h1 className="text-xl font-bold tracking-tight">{t("registerTitle")}</h1>

      <div className="mt-6 flex flex-col gap-4">
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

        <div className="flex flex-col gap-1.5">
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              checked={agreedToTerms}
              onChange={(event) => setAgreedToTerms(event.target.checked)}
              className="mt-0.5 size-4 shrink-0 rounded border-border text-primary focus:ring-primary"
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
                    className="font-semibold text-primary hover:underline"
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

        <OAuthButtons />

        <p className="text-center text-sm text-muted-foreground">
          {t("haveAccount")}{" "}
          <Link href="/login" className="font-semibold text-primary hover:underline">
            {t("goToLogin")}
          </Link>
        </p>
      </div>

      <TermsModal open={termsModalOpen} onClose={() => setTermsModalOpen(false)} />
    </form>
  );
}
