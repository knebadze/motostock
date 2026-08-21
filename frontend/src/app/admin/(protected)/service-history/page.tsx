import { getServiceTypesFromServer } from "@/lib/api/server";
import { ServiceHistoryManager } from "@/components/admin/service-history/ServiceHistoryManager";

export default async function ServiceHistoryPage() {
  const serviceTypes = await getServiceTypesFromServer();

  return <ServiceHistoryManager initialServiceTypes={serviceTypes} />;
}
