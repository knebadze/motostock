"use client";

import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { subscribeToNewsletter } from "@/lib/api/newsletter";
import { ApiRequestError } from "@/lib/api/client";

export function NewsletterSignupForm() {
  const t = useTranslations("Newsletter");
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
      toast.error(error instanceof ApiRequestError ? error.message : t("subscribeError"));
    } finally {
      setLoading(false);
    }
  }

  if (subscribed) {
    return (
      <div className="mt-4 max-w-md">
        <h3 className="text-sm font-semibold">{t("signupTitle")}</h3>
        <p className="mt-2 text-sm text-muted-foreground">{t("checkYourEmail")}</p>
      </div>
    );
  }

  return (
    <div className="mt-4 max-w-md">
      <h3 className="text-sm font-semibold">{t("signupTitle")}</h3>
      <p className="mt-1.5 text-sm text-muted-foreground">{t("signupDescription")}</p>
      <form onSubmit={handleSubmit} className="mt-3 flex flex-col gap-2 sm:flex-row">
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
    </div>
  );
}
