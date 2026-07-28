import type { Request, Response } from "express";
import { ApiError } from "../../lib/ApiError.js";
import { getUserById, listUsers } from "./users.service.js";

export async function me(req: Request, res: Response) {
  if (!req.user) {
    throw new ApiError(401, "Not authenticated");
  }

  const user = await getUserById(req.user.sub);
  res.status(200).json({ user });
}

export async function list(_req: Request, res: Response) {
  const users = await listUsers();
  res.status(200).json({ users });
}
