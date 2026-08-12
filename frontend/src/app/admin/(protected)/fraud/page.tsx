import { getSuspiciousLoginActivityFromServer } from "@/lib/api/server";
import { FraudManager } from "@/components/admin/fraud/FraudManager";

export default async function FraudPage() {
  const activity = await getSuspiciousLoginActivityFromServer();
  return <FraudManager initialActivity={activity} />;
}
