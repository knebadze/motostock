import type { Request, Response } from "express";
import { ApiError } from "../../lib/ApiError.js";
import * as banksService from "./banks.service.js";
import type { CreateBankInput, ReorderBanksInput, UpdateBankInput } from "./banks.schema.js";

export async function list(_req: Request, res: Response) {
  const items = await banksService.listBanks();
  res.status(200).json({ items });
}

export async function listPublic(_req: Request, res: Response) {
  const items = await banksService.listPublicBanks();
  res.status(200).json({ items });
}

export async function create(req: Request<unknown, unknown, CreateBankInput>, res: Response) {
  const item = await banksService.createBank(req.body);
  res.status(201).json({ item });
}

export async function update(
  req: Request<{ id: string }, unknown, UpdateBankInput>,
  res: Response,
) {
  const item = await banksService.updateBank(Number(req.params.id), req.body);
  res.status(200).json({ item });
}

export async function uploadLogo(req: Request<{ id: string }>, res: Response) {
  if (!req.file) {
    throw new ApiError(400, "ლოგო არ არის ატვირთული");
  }
  const item = await banksService.setBankLogo(Number(req.params.id), req.file);
  res.status(200).json({ item });
}

export async function reorder(
  req: Request<unknown, unknown, ReorderBanksInput>,
  res: Response,
) {
  const items = await banksService.reorderBanks(req.body);
  res.status(200).json({ items });
}

export async function remove(req: Request, res: Response) {
  await banksService.deleteBank(Number(req.params.id));
  res.status(204).send();
}
