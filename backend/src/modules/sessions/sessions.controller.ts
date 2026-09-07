import type { Request, Response } from "express";
import * as sessionsService from "./sessions.service.js";
import type { ListSessionsQuery } from "./sessions.schema.js";

export async function list(
  req: Request<unknown, unknown, unknown, ListSessionsQuery>,
  res: Response,
) {
  const result = await sessionsService.listSessions(req.query);
  res.status(200).json(result);
}

export async function revoke(req: Request<{ id: string }>, res: Response) {
  await sessionsService.revokeSession(Number(req.params.id));
  res.status(204).send();
}
