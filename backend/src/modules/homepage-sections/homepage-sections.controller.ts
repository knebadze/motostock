import type { Request, Response } from "express";
import * as homepageSectionsService from "./homepage-sections.service.js";
import type { UpdateHomepageSectionInput } from "./homepage-sections.schema.js";

export async function list(_req: Request, res: Response) {
  const items = await homepageSectionsService.listHomepageSections();
  res.status(200).json({ items });
}

export async function listPublic(_req: Request, res: Response) {
  const items = await homepageSectionsService.listPublicHomepageSections();
  res.status(200).json({ items });
}

export async function update(
  req: Request<{ id: string }, unknown, UpdateHomepageSectionInput>,
  res: Response,
) {
  const item = await homepageSectionsService.updateHomepageSection(
    Number(req.params.id),
    req.body,
  );
  res.status(200).json({ item });
}
