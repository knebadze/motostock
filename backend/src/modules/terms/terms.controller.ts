import type { Request, Response } from "express";
import * as termsService from "./terms.service.js";
import type { UpdateTermsInput } from "./terms.schema.js";

export async function getOne(_req: Request, res: Response) {
  const terms = await termsService.getTerms();
  res.status(200).json({ terms });
}

export async function update(req: Request<unknown, unknown, UpdateTermsInput>, res: Response) {
  const terms = await termsService.updateTerms(req.body);
  res.status(200).json({ terms });
}
