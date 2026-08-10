import type { Request, Response } from "express";
import * as homepageProductSlidersService from "./homepage-product-sliders.service.js";
import type { UpdateHomepageProductSliderInput } from "./homepage-product-sliders.schema.js";

export async function list(_req: Request, res: Response) {
  const items = await homepageProductSlidersService.listHomepageProductSliders();
  res.status(200).json({ items });
}

export async function listPublic(_req: Request, res: Response) {
  const items = await homepageProductSlidersService.listPublicHomepageProductSliders();
  res.status(200).json({ items });
}

export async function update(
  req: Request<{ id: string }, unknown, UpdateHomepageProductSliderInput>,
  res: Response,
) {
  const item = await homepageProductSlidersService.updateHomepageProductSlider(
    Number(req.params.id),
    req.body,
  );
  res.status(200).json({ item });
}
