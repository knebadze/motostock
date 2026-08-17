import type { Request, Response } from "express";
import * as faqService from "./faq.service.js";
import type { CreateFaqInput, ReorderFaqInput, UpdateFaqInput } from "./faq.schema.js";

export async function list(_req: Request, res: Response) {
  const items = await faqService.listFaqs();
  res.status(200).json({ items });
}

export async function listPublic(_req: Request, res: Response) {
  const items = await faqService.listFaqs(true);
  res.status(200).json({ items });
}

export async function create(req: Request<unknown, unknown, CreateFaqInput>, res: Response) {
  const item = await faqService.createFaq(req.body);
  res.status(201).json({ item });
}

export async function update(
  req: Request<{ id: string }, unknown, UpdateFaqInput>,
  res: Response,
) {
  const item = await faqService.updateFaq(Number(req.params.id), req.body);
  res.status(200).json({ item });
}

export async function reorder(
  req: Request<unknown, unknown, ReorderFaqInput>,
  res: Response,
) {
  const items = await faqService.reorderFaqs(req.body);
  res.status(200).json({ items });
}

export async function remove(req: Request, res: Response) {
  await faqService.deleteFaq(Number(req.params.id));
  res.status(204).send();
}
