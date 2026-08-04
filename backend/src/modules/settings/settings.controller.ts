import type { Request, Response } from "express";
import * as settingsService from "./settings.service.js";
import type { UpdateSettingsInput } from "./settings.schema.js";

export async function getOne(_req: Request, res: Response) {
  const settings = await settingsService.getSettings();
  res.status(200).json({ settings });
}

export async function getVinDecodeStatus(_req: Request, res: Response) {
  const status = await settingsService.getVinDecodeStatus();
  res.status(200).json(status);
}

export async function update(
  req: Request<unknown, unknown, UpdateSettingsInput>,
  res: Response,
) {
  const settings = await settingsService.updateSettings(req.body);
  res.status(200).json({ settings });
}
