import type { Metadata } from "next";
import { useTranslations } from "next-intl";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function OrdersPage() {
  const t = useTranslations("Account");

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">{t("nav.orders")}</h1>
      <p className="mt-2 text-muted-foreground">{t("orders.comingSoon")}</p>
    </div>
  );
}
