import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getCurrentUserFromServer } from "@/lib/api/server";
import { Link } from "@/i18n/navigation";
import { accountNav } from "@/config/account-nav";
import { EmailVerificationBanner } from "@/components/shared/EmailVerificationBanner";

// Private, user-specific data — keep it out of search results.
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function AccountDashboardPage() {
  const user = await getCurrentUserFromServer();
  return <AccountDashboardView name={user?.name ?? ""} emailVerified={user?.emailVerified ?? true} />;
}

function AccountDashboardView({
  name,
  emailVerified,
}: {
  name: string;
  emailVerified: boolean;
}) {
  const t = useTranslations("Account");
  const cards = accountNav.filter((item) => item.href !== "/account");

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">{t("dashboard.greeting", { name })}</h1>
      <p className="mt-2 text-muted-foreground">{t("dashboard.description")}</p>

      {!emailVerified && (
        <div className="mt-6">
          <EmailVerificationBanner message={t("dashboard.verifyEmailReminder")} />
        </div>
      )}

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-center gap-3 rounded-2xl border border-border bg-card p-5 transition-colors hover:border-primary hover:text-primary"
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              {item.icon}
            </span>
            <span className="font-medium">{t(`nav.${item.labelKey}`)}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
