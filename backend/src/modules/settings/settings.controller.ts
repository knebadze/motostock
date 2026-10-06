import type { Request, Response } from "express";
import { ApiError } from "../../lib/ApiError.js";
import { captureTestEvent } from "../../lib/sentry.js";
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

export async function getPublicMonitoringStatus(_req: Request, res: Response) {
  res.status(200).json({ sentryEnabled: await settingsService.isSentryEnabled() });
}

export function getMonitoringStatus(_req: Request, res: Response) {
  res.status(200).json(settingsService.getMonitoringStatus());
}

// Admin "send test event" — confirms the DSN works end to end. The event is
// still subject to the on/off toggle (lib/sentry.ts's beforeSend).
export function sendSentryTestEvent(_req: Request, res: Response) {
  if (!captureTestEvent()) {
    throw new ApiError(400, "Sentry არ არის დაკონფიგურირებული — დააყენეთ SENTRY_DSN სერვერის გარემოს ცვლადებში");
  }
  res.status(200).json({ sent: true });
}

export async function getGuestFeatureStatus(_req: Request, res: Response) {
  const status = await settingsService.getGuestFeatureStatus();
  res.status(200).json(status);
}

export async function update(
  req: Request<unknown, unknown, UpdateSettingsInput>,
  res: Response,
) {
  const settings = await settingsService.updateSettings(req.body);
  res.status(200).json({ settings });
}
