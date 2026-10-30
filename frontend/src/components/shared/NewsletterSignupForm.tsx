"use client";

import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { subscribeToNewsletter } from "@/lib/api/newsletter";
import { resolveApiErrorMessage } from "@/lib/api-errors";

// Just the email field + button (and the "check your email" note once sent)
// — the footer's newsletter strip supplies the heading and pitch around it.
export function NewsletterSignupForm() {
  const t = useTranslations("Newsletter");
  const tErrors = useTranslations("ApiErrors");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [subscribed, setSubscribed] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    try {
      await subscribeToNewsletter(email);
      setSubscribed(true);
    } catch (error) {
      toast.error(resolveApiErrorMessage(error, tErrors, t("subscribeError")));
    } finally {
      setLoading(false);
    }
  }

  if (subscribed) {
    return (
      <p role="status" className="text-sm font-medium text-foreground">
        {t("checkYourEmail")}
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full flex-col gap-2 sm:flex-row">
      <input
        type="email"
        required
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        placeholder={t("emailPlaceholder")}
        aria-label={t("emailPlaceholder")}
        className="min-w-0 flex-1 rounded-full border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary"
      />
      <button
        type="submit"
        disabled={loading}
        className="shrink-0 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover disabled:opacity-50"
      >
        {loading ? t("subscribeSubmitting") : t("subscribeSubmit")}
      </button>
    </form>
  );
}
