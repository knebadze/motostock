import {
  getServiceRecordsAdminFromServer,
  getServiceTypesFromServer,
  getTeamMembersFromServer,
} from "@/lib/api/server";
import { ServiceHistoryManager } from "@/components/admin/service-history/ServiceHistoryManager";

export default async function ServiceHistoryPage() {
  const [serviceTypes, teamMembers, recentServiceRecords] = await Promise.all([
    getServiceTypesFromServer(),
    getTeamMembersFromServer(),
    getServiceRecordsAdminFromServer(),
  ]);

  return (
    <ServiceHistoryManager
      initialServiceTypes={serviceTypes}
      teamMembers={teamMembers}
      initialRecentServiceRecords={recentServiceRecords}
    />
  );
}
