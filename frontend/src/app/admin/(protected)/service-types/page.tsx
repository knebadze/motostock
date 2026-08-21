import { getServiceTypesFromServer } from "@/lib/api/server";
import { ServiceTypesManager } from "@/components/admin/service-types/ServiceTypesManager";

export default async function ServiceTypesPage() {
  const serviceTypes = await getServiceTypesFromServer();

  return <ServiceTypesManager initialServiceTypes={serviceTypes} />;
}
