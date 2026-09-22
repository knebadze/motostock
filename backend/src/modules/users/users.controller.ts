import type { Request, Response } from "express";
import { ApiError } from "../../lib/ApiError.js";
import { setAuthCookie } from "../../lib/jwt.js";
import {
  changePassword as changePasswordService,
  createWalkInUser,
  getUserById,
  getUserDetail,
  listUsers,
  mergeUserInto,
} from "./users.service.js";
import type { ChangePasswordInput, CreateWalkInUserInput, ListUsersQuery } from "./users.schema.js";

export async function me(req: Request, res: Response) {
  if (!req.user) {
    throw new ApiError(401, "Not authenticated", "NOT_AUTHENTICATED");
  }

  const user = await getUserById(req.user.sub);
  res.status(200).json({ user });
}

export async function list(
  req: Request<unknown, unknown, unknown, ListUsersQuery>,
  res: Response,
) {
  const result = await listUsers(req.query);
  res.status(200).json(result);
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
    throw new ApiError(401, "Not authenticated", "NOT_AUTHENTICATED");
  }

  // Reissues the cookie so this exact session survives the tokenVersion bump
  // that just invalidated every other one — see users.service.ts's
  // changePassword. sessionId is carried through unchanged (mid-session
  // reissue, not a new login), same as loginAt.
  const token = await changePasswordService(
    req.user.sub,
    req.body,
    req.user.loginAt,
    req.user.sessionId,
  );
  await setAuthCookie(res, token);
  res.status(204).send();
}

export async function createWalkIn(
  req: Request<unknown, unknown, CreateWalkInUserInput>,
  res: Response,
) {
  const user = await createWalkInUser(req.body);
  res.status(201).json({ user });
}

export async function merge(req: Request<{ id: string; targetUserId: string }>, res: Response) {
  const user = await mergeUserInto(Number(req.params.id), Number(req.params.targetUserId));
  res.status(200).json({ user });
}
