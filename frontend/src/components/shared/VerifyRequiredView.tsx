"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { logoutUser } from "@/lib/api/auth";
import { EmailVerificationBanner } from "./EmailVerificationBanner";

// Landed on by account/layout.tsx's hard gate — an unverified user is
// redirected here instead of into /account. Session-based (unlike
// VerifyEmailView, which is token-only): the page wrapper already confirmed
// the visitor is logged in but unverified before rendering this.
export function VerifyRequiredView({ email }: { email: string }) {
  const t = useTranslations("Auth");
  const router = useRouter();

  async function handleLogout() {
    try {
      await logoutUser();
      router.push("/login");
      router.refresh();
    } catch {
      toast.error(t("verifyRequiredLogoutError"));
    }
  }

  return (
    <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center">
      <h1 className="text-xl font-bold tracking-tight">{t("verifyRequiredTitle")}</h1>
      <p className="mt-4 text-sm text-muted-foreground">
        {t("verifyRequiredDescription", { email })}
      </p>

      <div className="mt-6 text-left">
        <EmailVerificationBanner message={t("verifyRequiredBannerMessage")} />
      </div>

      <button
        type="button"
        onClick={handleLogout}
        className="mt-6 text-sm font-semibold text-muted-foreground transition-colors hover:text-primary"
      >
        {t("verifyRequiredLogout")}
      </button>
    </div>
  );
}
