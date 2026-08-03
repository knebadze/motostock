import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { ChangePasswordForm } from "@/components/account/ChangePasswordForm";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function ChangePasswordPage() {
  const t = useTranslations("Account");

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">{t("nav.changePassword")}</h1>
      <div className="mt-6">
        <ChangePasswordForm />
      </div>
    </div>
  );
}
