import { getPrivacyPolicyFromServer } from "@/lib/api/server";
import { PrivacyPolicyManager } from "@/components/admin/privacy-policy/PrivacyPolicyManager";

export default async function PrivacyPolicyPage() {
  const privacyPolicy = await getPrivacyPolicyFromServer();

  return <PrivacyPolicyManager initialPrivacyPolicy={privacyPolicy} />;
}
