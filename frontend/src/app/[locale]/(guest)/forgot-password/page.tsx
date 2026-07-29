import type { Metadata } from "next";
import { redirect } from "@/i18n/navigation";
import { getLocale } from "next-intl/server";
import { getCurrentUserFromServer } from "@/lib/api/server";
import { ForgotPasswordForm } from "@/components/shared/ForgotPasswordForm";

// Auth flows aren't content — keep them out of search results.
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function ForgotPasswordPage() {
  const user = await getCurrentUserFromServer();

  if (user) {
    const locale = await getLocale();
    redirect({ href: "/account", locale });
  }

  return (
    <div className="flex items-center justify-center px-4 py-24">
      <ForgotPasswordForm />
    </div>
  );
}
