import type { Metadata } from "next";
import { useTranslations } from "next-intl";

// Private, user-specific data — keep it out of search results.
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function AccountPage() {
  const t = useTranslations("Account");

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
      <p className="mt-2 text-muted-foreground">{t("description")}</p>
    </div>
  );
}
