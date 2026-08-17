import type { Metadata } from "next";
import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { getCurrentUserFromServer } from "@/lib/api/server";
import { VerifyRequiredView } from "@/components/shared/VerifyRequiredView";

// Auth/transactional flow, not content — keep it out of search results,
// same as verify-email/reset-password.
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function VerifyRequiredPage() {
  const user = await getCurrentUserFromServer();
  const locale = await getLocale();

  if (!user) {
    redirect({ href: "/login", locale });
    return null;
  }
  // Already verified (e.g. followed the emailed link in another tab, or
  // came back here after logging out and back in) — nothing to show,
  // account/layout.tsx will let them straight through now.
  if (user.emailVerified) {
    redirect({ href: "/account", locale });
    return null;
  }

  return (
    <div className="flex items-center justify-center px-4 py-24">
      <VerifyRequiredView email={user.email} />
    </div>
  );
}
