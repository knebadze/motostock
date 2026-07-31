import type { Request, Response } from "express";
import * as categoryFiltersService from "./category-filters.service.js";
import type {
  CategoryFilterListQuery,
  CreateCategoryFilterInput,
  UpdateCategoryFilterInput,
} from "./category-filters.schema.js";

export async function list(
  // Typed as Partial: the `validate` middleware already guarantees
  // categoryId is present (required, non-optional in the schema) before
  // this handler runs — Partial here is only to satisfy Express's route
  // generics, which check assignability against the default ParsedQs type.
  req: Request<unknown, unknown, unknown, Partial<CategoryFilterListQuery>>,
  res: Response,
) {
  const items = await categoryFiltersService.listCategoryFilters(Number(req.query.categoryId));
  res.status(200).json({ items });
}

export async function create(
  req: Request<unknown, unknown, CreateCategoryFilterInput>,
  res: Response,
) {
  const item = await categoryFiltersService.createCategoryFilter(req.body);
  res.status(201).json({ item });
}

export async function update(
  req: Request<{ id: string }, unknown, UpdateCategoryFilterInput>,
  res: Response,
) {
  const item = await categoryFiltersService.updateCategoryFilterSortOrder(
    Number(req.params.id),
    req.body.sortOrder,
  );
  res.status(200).json({ item });
}

export async function remove(req: Request, res: Response) {
  await categoryFiltersService.deleteCategoryFilter(Number(req.params.id));
  res.status(204).send();
}
