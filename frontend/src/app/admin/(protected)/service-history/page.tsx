import {
  getServiceTypesFromServer,
  getTeamMembersFromServer,
  getVehicleCatalogFromServer,
} from "@/lib/api/server";
import { ServiceHistoryManager } from "@/components/admin/service-history/ServiceHistoryManager";

export default async function ServiceHistoryPage() {
  const [serviceTypes, teamMembers, vehicleCatalog] = await Promise.all([
    getServiceTypesFromServer(),
    getTeamMembersFromServer(),
    getVehicleCatalogFromServer(),
  ]);

  return (
    <ServiceHistoryManager
      initialServiceTypes={serviceTypes}
      teamMembers={teamMembers}
      vehicleCatalog={vehicleCatalog}
    />
  );
}
