import { getTeamMembersFromServer } from "@/lib/api/server";
import { TeamMembersManager } from "@/components/admin/team-members/TeamMembersManager";

export default async function TeamMembersPage() {
  const members = await getTeamMembersFromServer();

  return <TeamMembersManager initialMembers={members} />;
}
