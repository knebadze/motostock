import { apiClient } from "./client";
import type { components } from "./generated/schema";

// Response/input shapes below aliasing `Schemas[...]` are generated from the
// backend's OpenAPI document (npm run api:types → generated/schema.d.ts).
type Schemas = components["schemas"];

export type TeamMember = Schemas["TeamMember"];

export type TeamMemberInput = Schemas["CreateTeamMemberInput"];

export async function listTeamMembers(): Promise<TeamMember[]> {
  const { data } = await apiClient.get<{ items: TeamMember[] }>("/team-members");
  return data.items;
}

export async function listPublicTeamMembers(): Promise<TeamMember[]> {
  const { data } = await apiClient.get<{ items: TeamMember[] }>("/team-members/public");
  return data.items;
}

export async function createTeamMember(input: TeamMemberInput): Promise<TeamMember> {
  const { data } = await apiClient.post<{ item: TeamMember }>("/team-members", input);
  return data.item;
}

export async function updateTeamMember(
  id: number,
  input: Partial<TeamMemberInput>,
): Promise<TeamMember> {
  const { data } = await apiClient.patch<{ item: TeamMember }>(`/team-members/${id}`, input);
  return data.item;
}

export async function uploadTeamMemberImage(id: number, file: File): Promise<TeamMember> {
  const formData = new FormData();
  formData.append("image", file);

  const { data } = await apiClient.post<{ item: TeamMember }>(`/team-members/${id}/image`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data.item;
}

export async function reorderTeamMembers(ids: number[]): Promise<TeamMember[]> {
  const { data } = await apiClient.put<{ items: TeamMember[] }>("/team-members/order", { ids });
  return data.items;
}

export async function deleteTeamMember(id: number): Promise<void> {
  await apiClient.delete(`/team-members/${id}`);
}
