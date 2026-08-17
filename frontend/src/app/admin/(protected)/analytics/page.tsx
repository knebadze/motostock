import { getAnalyticsFromServer } from "@/lib/api/server";
import { AnalyticsManager } from "@/components/admin/analytics/AnalyticsManager";

export default async function AnalyticsPage() {
  const data = await getAnalyticsFromServer();

  return <AnalyticsManager initialData={data} />;
}
