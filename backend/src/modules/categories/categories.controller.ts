import type { Request, Response } from "express";
import { ApiError } from "../../lib/ApiError.js";
import * as categoriesService from "./categories.service.js";
import type {
  CategoryListQuery,
  CreateCategoryInput,
  UpdateCategoryInput,
} from "./categories.schema.js";

export async function list(
  req: Request<unknown, unknown, unknown, CategoryListQuery>,
  res: Response,
) {
  const categories = await categoriesService.listCategories(req.query);
  res.status(200).json({ categories });
}

export async function getOne(req: Request, res: Response) {
  const category = await categoriesService.getCategory(Number(req.params.id));
  res.status(200).json({ category });
}

export async function create(
  req: Request<unknown, unknown, CreateCategoryInput>,
  res: Response,
) {
  const category = await categoriesService.createCategory(req.body);
  res.status(201).json({ category });
}

export async function update(
  req: Request<{ id: string }, unknown, UpdateCategoryInput>,
  res: Response,
) {
  const category = await categoriesService.updateCategory(
    Number(req.params.id),
    req.body,
  );
  res.status(200).json({ category });
}

export async function remove(req: Request, res: Response) {
  await categoriesService.deleteCategory(Number(req.params.id));
  res.status(204).send();
}

export async function uploadImage(req: Request, res: Response) {
  if (!req.file) {
    throw new ApiError(400, "სურათი არ არის მიბმული");
  }

  const category = await categoriesService.setCategoryImage(
    Number(req.params.id),
    req.file,
  );
  res.status(200).json({ category });
}

export async function uploadBannerImage(req: Request, res: Response) {
  if (!req.file) {
    throw new ApiError(400, "სურათი არ არის მიბმული");
  }

  const category = await categoriesService.setCategoryBannerImage(
    Number(req.params.id),
    req.file,
  );
  res.status(200).json({ category });
}
