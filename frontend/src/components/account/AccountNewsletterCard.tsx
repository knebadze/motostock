"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Toggle } from "@/components/shared/Toggle";
import {
  subscribeMeToNewsletter,
  unsubscribeMeFromNewsletter,
  type MyNewsletterStatus,
} from "@/lib/api/newsletter";
import { resolveApiErrorMessage } from "@/lib/api-errors";

// PENDING and CONFIRMED both read as "on" — the toggle only has two visual
// states, and PENDING (confirmation email sent, not yet clicked) is still
// the outcome of the user having just turned it on, distinguished instead
// by the hint text below the toggle rather than a third toggle state.
function isOn(status: MyNewsletterStatus): boolean {
  return status === "CONFIRMED" || status === "PENDING";
}

export function AccountNewsletterCard({ initialStatus }: { initialStatus: MyNewsletterStatus }) {
  const t = useTranslations("Account.newsletter");
  const tErrors = useTranslations("ApiErrors");
  const [status, setStatus] = useState(initialStatus);
  const [loading, setLoading] = useState(false);

  async function handleToggle(next: boolean) {
    setLoading(true);
    try {
      if (next) {
        await subscribeMeToNewsletter();
        // subscribe() (see newsletter.service.ts) resets an
        // UNSUBSCRIBED/PENDING row to PENDING and resends the confirmation
        // email; an already-CONFIRMED row is left untouched — reflect that
        // same distinction locally instead of a round-trip re-fetch.
        setStatus((prev) => (prev === "CONFIRMED" ? prev : "PENDING"));
        toast.success(t("subscribeSuccess"));
      } else {
        await unsubscribeMeFromNewsletter();
        setStatus("UNSUBSCRIBED");
        toast.success(t("unsubscribeSuccess"));
      }
    } catch (error) {
      toast.error(resolveApiErrorMessage(error, tErrors, t("error")));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium">{t("label")}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {status === "PENDING" ? t("pendingHint") : t("description")}
          </p>
        </div>
        <Toggle checked={isOn(status)} onChange={handleToggle} disabled={loading} label={t("label")} />
      </div>
    </div>
  );
}
