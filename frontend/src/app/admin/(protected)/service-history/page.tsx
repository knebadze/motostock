import { getServiceTypesFromServer, getTeamMembersFromServer } from "@/lib/api/server";
import { ServiceHistoryManager } from "@/components/admin/service-history/ServiceHistoryManager";

export default async function ServiceHistoryPage() {
  const [serviceTypes, teamMembers] = await Promise.all([
    getServiceTypesFromServer(),
    getTeamMembersFromServer(),
  ]);

  return <ServiceHistoryManager initialServiceTypes={serviceTypes} teamMembers={teamMembers} />;
}
