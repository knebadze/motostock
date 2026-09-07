import { getVisitorOverviewFromServer } from "@/lib/api/server";
import { VisitorsManager } from "@/components/admin/visitors/VisitorsManager";

export default async function VisitorsPage() {
  const initialData = await getVisitorOverviewFromServer();
  return <VisitorsManager initialData={initialData} />;
}
