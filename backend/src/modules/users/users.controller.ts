import type { Request, Response } from "express";
import { ApiError } from "../../lib/ApiError.js";
import {
  changePassword as changePasswordService,
  getUserById,
  getUserDetail,
  listUsers,
} from "./users.service.js";
import type { ChangePasswordInput } from "./users.schema.js";

export async function me(req: Request, res: Response) {
  if (!req.user) {
    throw new ApiError(401, "Not authenticated");
  }

  const user = await getUserById(req.user.sub);
  res.status(200).json({ user });
}

export async function list(req: Request<unknown, unknown, unknown, { q?: string }>, res: Response) {
  const users = await listUsers(req.query.q);
  res.status(200).json({ users });
}

export async function getOne(req: Request, res: Response) {
  const user = await getUserDetail(Number(req.params.id));
  res.status(200).json({ user });
}

export async function changePassword(
  req: Request<unknown, unknown, ChangePasswordInput>,
  res: Response,
) {
  if (!req.user) {
    throw new ApiError(401, "Not authenticated");
  }

  await changePasswordService(req.user.sub, req.body);
  res.status(204).send();
}
