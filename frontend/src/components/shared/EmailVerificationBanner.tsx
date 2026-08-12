"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { resendVerificationEmail } from "@/lib/api/auth";
import { ApiRequestError } from "@/lib/api/client";

// Shared between the checkout flow (blocks placing an order) and the
// account dashboard (a passive reminder) — same message-plus-resend shape,
// just a different `message` and trigger.
export function EmailVerificationBanner({ message }: { message: string }) {
  const t = useTranslations("Auth");
  const [resending, setResending] = useState(false);

  async function handleResend() {
    setResending(true);
    try {
      await resendVerificationEmail();
      toast.success(t("verificationResent"));
    } catch (error) {
      toast.error(error instanceof ApiRequestError ? error.message : t("verificationResendError"));
    } finally {
      setResending(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm">
      <span className="text-foreground">{message}</span>
      <button
        type="button"
        onClick={handleResend}
        disabled={resending}
        className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover disabled:opacity-50"
      >
        {resending ? t("verificationResending") : t("resendVerification")}
      </button>
    </div>
  );
}
