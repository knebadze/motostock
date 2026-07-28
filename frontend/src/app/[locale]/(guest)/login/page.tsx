import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { getCurrentUserFromServer } from "@/lib/api/server";
import { LoginForm } from "@/components/shared/LoginForm";

export default async function LoginPage() {
  const user = await getCurrentUserFromServer();

  if (user) {
    const locale = await getLocale();
    redirect({ href: "/account", locale });
  }

  return (
    <div className="flex items-center justify-center px-4 py-24">
      <LoginForm />
    </div>
  );
}
