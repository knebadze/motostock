import type { Request, Response } from "express";
import * as vacanciesService from "./vacancies.service.js";
import type { CreateVacancyInput, UpdateVacancyInput } from "./vacancies.schema.js";

export async function list(_req: Request, res: Response) {
  const items = await vacanciesService.listVacancies();
  res.status(200).json({ items });
}

export async function listPublic(_req: Request, res: Response) {
  const items = await vacanciesService.listVacancies(true);
  res.status(200).json({ items });
}

export async function getBySlug(req: Request<{ slug: string }>, res: Response) {
  const item = await vacanciesService.getVacancyBySlug(req.params.slug);
  res.status(200).json({ item });
}

export async function create(req: Request<unknown, unknown, CreateVacancyInput>, res: Response) {
  const item = await vacanciesService.createVacancy(req.body);
  res.status(201).json({ item });
}

export async function update(
  req: Request<{ id: string }, unknown, UpdateVacancyInput>,
  res: Response,
) {
  const item = await vacanciesService.updateVacancy(Number(req.params.id), req.body);
  res.status(200).json({ item });
}

export async function remove(req: Request, res: Response) {
  await vacanciesService.deleteVacancy(Number(req.params.id));
  res.status(204).send();
}
