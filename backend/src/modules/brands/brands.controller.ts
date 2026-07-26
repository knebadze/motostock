import type { Request, Response } from "express";
import { ApiError } from "../../lib/ApiError.js";
import * as brandsService from "./brands.service.js";
import type { CreateBrandInput, UpdateBrandInput } from "./brands.schema.js";

export async function list(_req: Request, res: Response) {
  const brands = await brandsService.listBrands();
  res.status(200).json({ brands });
}

export async function getOne(req: Request, res: Response) {
  const brand = await brandsService.getBrand(Number(req.params.id));
  res.status(200).json({ brand });
}

export async function create(
  req: Request<unknown, unknown, CreateBrandInput>,
  res: Response,
) {
  const brand = await brandsService.createBrand(req.body);
  res.status(201).json({ brand });
}

export async function update(
  req: Request<{ id: string }, unknown, UpdateBrandInput>,
  res: Response,
) {
  const brand = await brandsService.updateBrand(Number(req.params.id), req.body);
  res.status(200).json({ brand });
}

export async function remove(req: Request, res: Response) {
  await brandsService.deleteBrand(Number(req.params.id));
  res.status(204).send();
}

export async function uploadLogo(req: Request, res: Response) {
  if (!req.file) {
    throw new ApiError(400, "ლოგო არ არის მიბმული");
  }

  const brand = await brandsService.setBrandLogo(Number(req.params.id), req.file);
  res.status(200).json({ brand });
}
