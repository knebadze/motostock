import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { getCurrentUserFromServer } from "@/lib/api/server";
import { RegisterForm } from "@/components/shared/RegisterForm";

export default async function RegisterPage() {
  const user = await getCurrentUserFromServer();

  if (user) {
    const locale = await getLocale();
    redirect({ href: "/account", locale });
  }

  return (
    <div className="flex items-center justify-center px-4 py-24">
      <RegisterForm />
    </div>
  );
}
