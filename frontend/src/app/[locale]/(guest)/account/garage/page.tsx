import type { Metadata } from "next";
import { useTranslations } from "next-intl";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function GaragePage() {
  const t = useTranslations("Account");

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">{t("nav.garage")}</h1>
      <p className="mt-2 text-muted-foreground">{t("garage.comingSoon")}</p>
    </div>
  );
}
