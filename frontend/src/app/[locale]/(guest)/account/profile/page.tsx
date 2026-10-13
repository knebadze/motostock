import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getMyProfileFromServer } from "@/lib/api/server";
import { ProfileManager } from "@/components/account/ProfileManager";
import { noindexMetadata } from "@/lib/seo";

export const metadata: Metadata = noindexMetadata({ follow: false });

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
