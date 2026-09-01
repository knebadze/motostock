"use client";

import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Link } from "@/i18n/navigation";
import { requestPasswordReset } from "@/lib/api/auth";
import { resolveApiErrorMessage } from "@/lib/api-errors";

export function ForgotPasswordForm() {
  const t = useTranslations("Auth");
  const tErrors = useTranslations("ApiErrors");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);

    try {
      await requestPasswordReset(email);
      setSent(true);
    } catch (error) {
      toast.error(resolveApiErrorMessage(error, tErrors, t("forgotPasswordError")));
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-8 text-center">
        <h1 className="text-xl font-bold tracking-tight">{t("forgotPasswordTitle")}</h1>
        <p className="mt-4 text-sm text-muted-foreground">{t("forgotPasswordSent")}</p>
        <Link
          href="/login"
          className="mt-6 inline-block font-semibold text-primary hover:underline"
        >
          {t("backToLogin")}
        </Link>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full max-w-sm rounded-2xl border border-border bg-card p-8"
    >
      <h1 className="text-xl font-bold tracking-tight">{t("forgotPasswordTitle")}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{t("forgotPasswordDescription")}</p>

      <div className="mt-6 flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="email" className="text-sm font-medium">
            {t("emailLabel")}
          </label>
          <input
            id="email"
            type="email"
            required
            autoComplete="username"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="mt-2 rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover disabled:opacity-50"
        >
          {loading ? t("forgotPasswordSubmitting") : t("forgotPasswordSubmit")}
        </button>

        <p className="text-center text-sm text-muted-foreground">
          <Link href="/login" className="font-semibold text-primary hover:underline">
            {t("backToLogin")}
          </Link>
        </p>
      </div>
    </form>
  );
}
