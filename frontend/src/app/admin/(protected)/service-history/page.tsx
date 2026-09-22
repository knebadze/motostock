import {
  getServiceRecordsAdminFromServer,
  getServiceTypesFromServer,
  getTeamMembersFromServer,
  getVehicleCatalogFromServer,
} from "@/lib/api/server";
import { ServiceHistoryManager } from "@/components/admin/service-history/ServiceHistoryManager";

export default async function ServiceHistoryPage() {
  const [serviceTypes, teamMembers, vehicleCatalog, recentServiceRecords] = await Promise.all([
    getServiceTypesFromServer(),
    getTeamMembersFromServer(),
    getVehicleCatalogFromServer(),
    getServiceRecordsAdminFromServer(),
  ]);

  return (
    <ServiceHistoryManager
      initialServiceTypes={serviceTypes}
      teamMembers={teamMembers}
      vehicleCatalog={vehicleCatalog}
      initialRecentServiceRecords={recentServiceRecords}
    />
  );
}
