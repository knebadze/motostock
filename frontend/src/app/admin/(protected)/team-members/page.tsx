import { getLookupItemsFromServer, getTeamMembersFromServer } from "@/lib/api/server";
import { TeamMembersManager } from "@/components/admin/team-members/TeamMembersManager";

export default async function TeamMembersPage() {
  const [members, positions] = await Promise.all([
    getTeamMembersFromServer(),
    getLookupItemsFromServer("positions"),
  ]);

  return <TeamMembersManager initialMembers={members} positions={positions} />;
}
