import type { Request, Response } from "express";
import { ApiError } from "../../lib/ApiError.js";
import * as heroSlidesService from "./hero-slides.service.js";
import type {
  CreateHeroSlideInput,
  ReorderHeroSlidesInput,
  UpdateHeroSlideInput,
} from "./hero-slides.schema.js";

export async function list(_req: Request, res: Response) {
  const items = await heroSlidesService.listHeroSlides();
  res.status(200).json({ items });
}

export async function listPublic(_req: Request, res: Response) {
  const items = await heroSlidesService.listHeroSlides(true);
  res.status(200).json({ items });
}

export async function create(req: Request<unknown, unknown, CreateHeroSlideInput>, res: Response) {
  const item = await heroSlidesService.createHeroSlide(req.body);
  res.status(201).json({ item });
}

export async function update(
  req: Request<{ id: string }, unknown, UpdateHeroSlideInput>,
  res: Response,
) {
  const item = await heroSlidesService.updateHeroSlide(Number(req.params.id), req.body);
  res.status(200).json({ item });
}

export async function uploadImage(req: Request<{ id: string }>, res: Response) {
  if (!req.file) {
    throw new ApiError(400, "სურათი არ არის ატვირთული");
  }
  const item = await heroSlidesService.setHeroSlideImage(Number(req.params.id), req.file);
  res.status(200).json({ item });
}

export async function reorder(
  req: Request<unknown, unknown, ReorderHeroSlidesInput>,
  res: Response,
) {
  const items = await heroSlidesService.reorderHeroSlides(req.body);
  res.status(200).json({ items });
}

export async function remove(req: Request, res: Response) {
  await heroSlidesService.deleteHeroSlide(Number(req.params.id));
  res.status(204).send();
}
