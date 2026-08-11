import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getMyCompareFromServer } from "@/lib/api/server";
import { CompareManager } from "@/components/account/CompareManager";

export const metadata: Metadata = { robots: { index: false, follow: false } };

// Deliberately NOT under /account, same reasoning as wishlist/page.tsx —
// comparison must work for guests too, unconditionally (no Settings gate
// unlike wishlist). getMyCompareFromServer just forwards whatever cookies
// exist (auth or guest) and lets the backend sort out ownership.
export default async function ComparePage() {
  const items = await getMyCompareFromServer();

  return <ComparePageView items={items} />;
}

function ComparePageView({ items }: { items: Awaited<ReturnType<typeof getMyCompareFromServer>> }) {
  const t = useTranslations("Account");

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold tracking-tight">{t("nav.compare")}</h1>
      <p className="mt-2 text-muted-foreground">{t("compare.description")}</p>
      <CompareManager initialItems={items} />
    </div>
  );
}
