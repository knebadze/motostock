import type { Request, Response } from "express";
import { ApiError } from "../../lib/ApiError.js";
import { AUTH_COOKIE_NAME, setAuthCookie } from "../../lib/jwt.js";
import { getClientIp, getClientUserAgent } from "../../lib/request-ip.js";
import {
  acceptCurrentConsents,
  deleteAccount,
  exportAccountData,
  getProfile,
  updateProfile,
} from "./account-data.service.js";
import type { DeleteAccountInput, UpdateProfileInput } from "./users.schema.js";
import {
  changePassword as changePasswordService,
  createWalkInUser,
  getUserById,
  getUserDetail,
  listUsers,
  mergeUserInto,
  updateUserRole,
} from "./users.service.js";
import type {
  ChangePasswordInput,
  CreateWalkInUserInput,
  ListUsersQuery,
  UpdateUserRoleInput,
} from "./users.schema.js";

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
  const result = await listUsers(req.query, req.user?.role);
  res.status(200).json(result);
}

export async function getOne(req: Request, res: Response) {
  const user = await getUserDetail(Number(req.params.id), req.user?.role);
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
  const user = await mergeUserInto(Number(req.params.id), Number(req.params.targetUserId), req.user?.role);
  res.status(200).json({ user });
}

export async function updateRole(
  req: Request<{ id: string }, unknown, UpdateUserRoleInput>,
  res: Response,
) {
  if (!req.user) {
    throw new ApiError(401, "Not authenticated", "NOT_AUTHENTICATED");
  }

  const user = await updateUserRole(Number(req.params.id), req.user.sub, req.body);
  res.status(200).json({ user });
}

function requireUserId(req: Request): number {
  if (!req.user) {
    throw new ApiError(401, "Not authenticated", "NOT_AUTHENTICATED");
  }
  return req.user.sub;
}

export async function getMyProfile(req: Request, res: Response) {
  const profile = await getProfile(requireUserId(req));
  res.status(200).json({ profile });
}

export async function updateMyProfile(req: Request<unknown, unknown, UpdateProfileInput>, res: Response) {
  const profile = await updateProfile(requireUserId(req as unknown as Request), req.body);
  res.status(200).json({ profile });
}

export async function acceptMyConsents(req: Request, res: Response) {
  const profile = await acceptCurrentConsents(requireUserId(req), {
    ipAddress: getClientIp(req),
    userAgent: getClientUserAgent(req),
  });
  res.status(200).json({ profile });
}

// Served as a file download (the account page links straight to it).
export async function exportMyData(req: Request, res: Response) {
  const data = await exportAccountData(requireUserId(req));
  const date = new Date().toISOString().slice(0, 10);
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="motostock-my-data-${date}.json"`);
  res.setHeader("Cache-Control", "no-store");
  res.status(200).send(JSON.stringify(data, null, 2));
}

export async function deleteMyAccount(req: Request<unknown, unknown, DeleteAccountInput>, res: Response) {
  const result = await deleteAccount(requireUserId(req as unknown as Request), req.body);
  // Same as logout — every session row is already gone with the account.
  res.clearCookie(AUTH_COOKIE_NAME);
  res.status(200).json(result);
}
