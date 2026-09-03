import { ApiError } from "../../lib/ApiError.js";
import { deleteUploadedImage, saveUploadedImage } from "../../lib/storage.js";
import { lookupsRepository } from "../lookups/lookups.repository.js";
import { getLookupDelegate } from "../lookups/lookups.registry.js";
import { teamMembersRepository } from "./team-members.repository.js";
import type {
  CreateTeamMemberInput,
  ReorderTeamMembersInput,
  UpdateTeamMemberInput,
} from "./team-members.schema.js";

type TeamMemberRow = {
  id: number;
  nameKa: string;
  nameEn: string;
  nameRu: string;
  positionId: number;
  position: { nameKa: string; nameEn: string; nameRu: string };
  imageUrl: string | null;
  isActive: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
};

function toResponse(row: TeamMemberRow) {
  return {
    id: row.id,
    name: { ka: row.nameKa, en: row.nameEn, ru: row.nameRu },
    positionId: row.positionId,
    role: { ka: row.position.nameKa, en: row.position.nameEn, ru: row.position.nameRu },
    imageUrl: row.imageUrl,
    isActive: row.isActive,
    sortOrder: row.sortOrder,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

async function assertPositionExists(positionId: number) {
  const position = await lookupsRepository.findById(getLookupDelegate("positions"), positionId);
  if (!position) {
    throw new ApiError(400, "მითითებული თანამდებობა არ არსებობს");
  }
}

export async function listTeamMembers(onlyActive?: boolean) {
  const rows = await teamMembersRepository.findMany(onlyActive);
  return rows.map(toResponse);
}

export async function getTeamMember(id: number) {
  const row = await teamMembersRepository.findById(id);
  if (!row) {
    throw new ApiError(404, "გუნდის წევრი ვერ მოიძებნა");
  }
  return toResponse(row);
}

export async function createTeamMember(input: CreateTeamMemberInput) {
  await assertPositionExists(input.positionId);

  const row = await teamMembersRepository.create({
    nameKa: input.name.ka,
    nameEn: input.name.en,
    nameRu: input.name.ru,
    positionId: input.positionId,
    isActive: input.isActive ?? true,
  });
  return toResponse(row);
}

export async function updateTeamMember(id: number, input: UpdateTeamMemberInput) {
  const existing = await teamMembersRepository.findById(id);
  if (!existing) {
    throw new ApiError(404, "გუნდის წევრი ვერ მოიძებნა");
  }

  if (input.positionId !== undefined) {
    await assertPositionExists(input.positionId);
  }

  const row = await teamMembersRepository.update(id, {
    ...(input.name !== undefined
      ? { nameKa: input.name.ka, nameEn: input.name.en, nameRu: input.name.ru }
      : {}),
    ...(input.positionId !== undefined ? { positionId: input.positionId } : {}),
    ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
  });
  return toResponse(row);
}

export async function setTeamMemberImage(id: number, file: Express.Multer.File) {
  const existing = await teamMembersRepository.findById(id);
  if (!existing) {
    throw new ApiError(404, "გუნდის წევრი ვერ მოიძებნა");
  }

  const imageUrl = await saveUploadedImage("team-members", file);
  const row = await teamMembersRepository.updateImage(id, imageUrl);
  void deleteUploadedImage(existing.imageUrl);
  return toResponse(row);
}

export async function reorderTeamMembers(input: ReorderTeamMembersInput) {
  const existing = await teamMembersRepository.findMany();
  const existingIds = new Set(existing.map((row) => row.id));

  if (input.ids.length !== existing.length || !input.ids.every((id) => existingIds.has(id))) {
    throw new ApiError(400, "მითითებული წევრების სია არ ემთხვევა არსებულს");
  }

  await teamMembersRepository.reorder(input.ids);
  return listTeamMembers();
}

export async function deleteTeamMember(id: number) {
  const existing = await teamMembersRepository.findById(id);
  if (!existing) {
    throw new ApiError(404, "გუნდის წევრი ვერ მოიძებნა");
  }

  await teamMembersRepository.delete(id);
}
