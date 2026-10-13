import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getMyProfileFromServer } from "@/lib/api/server";
import { ProfileManager } from "@/components/account/ProfileManager";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function ProfilePage() {
  const [profile, t] = await Promise.all([getMyProfileFromServer(), getTranslations("Account")]);
  if (!profile) notFound();

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">{t("nav.profile")}</h1>
      <div className="mt-6">
        <ProfileManager initialProfile={profile} />
      </div>
    </div>
  );
}
