import type { Request, Response } from "express";
import * as productFitmentRulesService from "./product-fitment-rules.service.js";
import type { CreateProductFitmentRuleInput } from "./product-fitment-rules.schema.js";

export async function list(req: Request<{ productId: string }>, res: Response) {
  const items = await productFitmentRulesService.listProductFitmentRules(
    Number(req.params.productId),
  );
  res.status(200).json({ items });
}

export async function create(
  req: Request<{ productId: string }, unknown, CreateProductFitmentRuleInput>,
  res: Response,
) {
  const item = await productFitmentRulesService.createProductFitmentRule(
    Number(req.params.productId),
    req.body,
  );
  res.status(201).json({ item });
}

export async function remove(req: Request<{ productId: string; id: string }>, res: Response) {
  await productFitmentRulesService.deleteProductFitmentRule(
    Number(req.params.productId),
    Number(req.params.id),
  );
  res.status(204).send();
}
