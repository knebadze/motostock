import type { Request, Response } from "express";
import { ApiError } from "../../lib/ApiError.js";
import * as bulkDiscountEventsService from "./bulk-discount-events.service.js";
import type {
  BulkDiscountEventHeroSlideInput,
  BulkDiscountEventInput,
  ListBulkDiscountEventsQuery,
  RepeatBulkDiscountEventInput,
} from "./bulk-discount-events.schema.js";

export async function list(
  req: Request<unknown, unknown, unknown, ListBulkDiscountEventsQuery>,
  res: Response,
) {
  const result = await bulkDiscountEventsService.listEvents(req.query);
  res.status(200).json(result);
}

export async function repeat(
  req: Request<{ id: string }, unknown, RepeatBulkDiscountEventInput>,
  res: Response,
) {
  const item = await bulkDiscountEventsService.repeatEvent(Number(req.params.id), req.body);
  res.status(201).json({ item });
}

export async function update(
  req: Request<{ id: string }, unknown, BulkDiscountEventInput>,
  res: Response,
) {
  const item = await bulkDiscountEventsService.updateEvent(Number(req.params.id), req.body);
  res.status(200).json({ item });
}

export async function uploadImage(req: Request<{ id: string }>, res: Response) {
  if (!req.file) {
    throw new ApiError(400, "სურათი არ არის ატვირთული");
  }
  const item = await bulkDiscountEventsService.setEventImage(Number(req.params.id), req.file);
  res.status(200).json({ item });
}

export async function getHeroSlide(req: Request<{ id: string }>, res: Response) {
  const item = await bulkDiscountEventsService.getEventHeroSlide(Number(req.params.id));
  res.status(200).json({ item });
}

export async function setHeroSlide(
  req: Request<{ id: string }, unknown, BulkDiscountEventHeroSlideInput>,
  res: Response,
) {
  const item = await bulkDiscountEventsService.setEventHeroSlide(Number(req.params.id), req.body);
  res.status(200).json({ item });
}

export async function uploadHeroSlideImage(req: Request<{ id: string }>, res: Response) {
  if (!req.file) {
    throw new ApiError(400, "სურათი არ არის ატვირთული");
  }
  const item = await bulkDiscountEventsService.setEventHeroSlideImage(Number(req.params.id), req.file);
  res.status(200).json({ item });
}

export async function remove(req: Request, res: Response) {
  await bulkDiscountEventsService.deleteEvent(Number(req.params.id));
  res.status(204).send();
}
