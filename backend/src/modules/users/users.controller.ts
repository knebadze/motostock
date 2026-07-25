import type { Request, Response } from "express";
import { ApiError } from "../../lib/ApiError.js";
import { getUserById } from "./users.service.js";

export async function me(req: Request, res: Response) {
  if (!req.user) {
    throw new ApiError(401, "Not authenticated");
  }

  const user = await getUserById(req.user.sub);
  res.status(200).json({ user });
}
