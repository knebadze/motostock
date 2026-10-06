import type { Metadata } from "next";
import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { getCurrentUserFromServer, getOAuthStatusFromServer } from "@/lib/api/server";
import { resolveRedirectTarget } from "@/lib/auth-redirect";
import { LoginForm } from "@/components/shared/LoginForm";

// Auth flows aren't content — keep them out of search results.
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string | string[] }>;
}) {
  const [user, oauthStatus, { redirect: redirectParam }] = await Promise.all([
    getCurrentUserFromServer(),
    getOAuthStatusFromServer(),
    searchParams,
  ]);

  if (user) {
    const locale = await getLocale();
    // Already signed in (e.g. a second tab finished the login) — honor the
    // same ?redirect= the form would have, not always /account.
    redirect({
      href: resolveRedirectTarget(typeof redirectParam === "string" ? redirectParam : null),
      locale,
    });
  }

  return (
    <div className="flex items-center justify-center px-4 py-24">
      <LoginForm oauthStatus={oauthStatus} />
    </div>
  );
}
