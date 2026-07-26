import type { Request, Response } from "express";
import * as lookupsService from "./lookups.service.js";
import type { LookupType } from "./lookups.registry.js";
import type { CreateLookupItemInput, UpdateLookupItemInput } from "./lookups.schema.js";

export async function list(req: Request<{ type: LookupType }>, res: Response) {
  const items = await lookupsService.listLookupItems(req.params.type);
  res.status(200).json({ items });
}

export async function create(
  req: Request<{ type: LookupType }, unknown, CreateLookupItemInput>,
  res: Response,
) {
  const item = await lookupsService.createLookupItem(req.params.type, req.body);
  res.status(201).json({ item });
}

export async function update(
  req: Request<{ type: LookupType; id: string }, unknown, UpdateLookupItemInput>,
  res: Response,
) {
  const item = await lookupsService.updateLookupItem(
    req.params.type,
    Number(req.params.id),
    req.body,
  );
  res.status(200).json({ item });
}

export async function remove(req: Request<{ type: LookupType; id: string }>, res: Response) {
  await lookupsService.deleteLookupItem(req.params.type, Number(req.params.id));
  res.status(204).send();
}
