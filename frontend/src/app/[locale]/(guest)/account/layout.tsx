import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { getCurrentUserFromServer } from "@/lib/api/server";
import { AccountSidebar } from "@/components/account/AccountSidebar";

export default async function AccountLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getCurrentUserFromServer();

  if (!user) {
    const locale = await getLocale();
    redirect({ href: "/login", locale });
    return null;
  }

  // Hard gate — an unverified account never reaches any /account/* page,
  // not just checkout (see orders.service.ts's assertEmailVerified for the
  // other half of this gate).
  if (!user.emailVerified) {
    const locale = await getLocale();
    redirect({ href: "/verify-required", locale });
    return null;
  }

  return (
    <main className="flex-1">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-[260px_1fr]">
          <AccountSidebar user={user} />
          <div className="min-w-0">{children}</div>
        </div>
      </div>
    </main>
  );
}
