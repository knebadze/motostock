import type { Request, Response } from "express";
import * as newsletterCampaignsService from "./newsletter-campaigns.service.js";
import type {
  CreateNewsletterCampaignInput,
  UpdateNewsletterCampaignInput,
} from "./newsletter-campaigns.schema.js";

export async function list(_req: Request, res: Response) {
  const items = await newsletterCampaignsService.listCampaigns();
  res.status(200).json({ items });
}

export async function getOne(req: Request<{ id: string }>, res: Response) {
  const item = await newsletterCampaignsService.getCampaign(Number(req.params.id));
  res.status(200).json({ item });
}

export async function create(
  req: Request<unknown, unknown, CreateNewsletterCampaignInput>,
  res: Response,
) {
  const item = await newsletterCampaignsService.createCampaign(req.body);
  res.status(201).json({ item });
}

export async function update(
  req: Request<{ id: string }, unknown, UpdateNewsletterCampaignInput>,
  res: Response,
) {
  const item = await newsletterCampaignsService.updateCampaign(Number(req.params.id), req.body);
  res.status(200).json({ item });
}

export async function remove(req: Request<{ id: string }>, res: Response) {
  await newsletterCampaignsService.deleteCampaign(Number(req.params.id));
  res.status(204).send();
}

export async function send(req: Request<{ id: string }>, res: Response) {
  const item = await newsletterCampaignsService.sendCampaign(Number(req.params.id));
  res.status(200).json({ item });
}
