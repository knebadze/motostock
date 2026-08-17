import type { Request, Response } from "express";
import { ApiError } from "../../lib/ApiError.js";
import * as teamMembersService from "./team-members.service.js";
import type {
  CreateTeamMemberInput,
  ReorderTeamMembersInput,
  UpdateTeamMemberInput,
} from "./team-members.schema.js";

export async function list(_req: Request, res: Response) {
  const items = await teamMembersService.listTeamMembers();
  res.status(200).json({ items });
}

export async function listPublic(_req: Request, res: Response) {
  const items = await teamMembersService.listTeamMembers(true);
  res.status(200).json({ items });
}

export async function create(req: Request<unknown, unknown, CreateTeamMemberInput>, res: Response) {
  const item = await teamMembersService.createTeamMember(req.body);
  res.status(201).json({ item });
}

export async function update(
  req: Request<{ id: string }, unknown, UpdateTeamMemberInput>,
  res: Response,
) {
  const item = await teamMembersService.updateTeamMember(Number(req.params.id), req.body);
  res.status(200).json({ item });
}

export async function uploadImage(req: Request<{ id: string }>, res: Response) {
  if (!req.file) {
    throw new ApiError(400, "სურათი არ არის ატვირთული");
  }
  const item = await teamMembersService.setTeamMemberImage(Number(req.params.id), req.file);
  res.status(200).json({ item });
}

export async function reorder(
  req: Request<unknown, unknown, ReorderTeamMembersInput>,
  res: Response,
) {
  const items = await teamMembersService.reorderTeamMembers(req.body);
  res.status(200).json({ items });
}

export async function remove(req: Request, res: Response) {
  await teamMembersService.deleteTeamMember(Number(req.params.id));
  res.status(204).send();
}
