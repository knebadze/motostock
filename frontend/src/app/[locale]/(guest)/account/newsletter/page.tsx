import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getMyNewsletterStatusFromServer } from "@/lib/api/server";
import { AccountNewsletterCard } from "@/components/account/AccountNewsletterCard";
import type { MyNewsletterStatus } from "@/lib/api/newsletter";
import { noindexMetadata } from "@/lib/seo";

export const metadata: Metadata = noindexMetadata({ follow: false });

export default async function AccountNewsletterPage() {
  const status = await getMyNewsletterStatusFromServer();
  return <AccountNewsletterView status={status} />;
}

function AccountNewsletterView({ status }: { status: MyNewsletterStatus }) {
  const t = useTranslations("Account");

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">{t("nav.newsletter")}</h1>
      <div className="mt-6">
        <AccountNewsletterCard initialStatus={status} />
      </div>
    </div>
  );
}
