import type { Request, Response } from "express";
import { ApiError } from "../../lib/ApiError.js";
import * as companyInfoService from "./company-info.service.js";
import type { UpdateCompanyInfoInput } from "./company-info.schema.js";

export async function getOne(_req: Request, res: Response) {
  const companyInfo = await companyInfoService.getCompanyInfo();
  res.status(200).json({ companyInfo });
}

export async function update(
  req: Request<unknown, unknown, UpdateCompanyInfoInput>,
  res: Response,
) {
  const companyInfo = await companyInfoService.updateCompanyInfo(req.body);
  res.status(200).json({ companyInfo });
}

export async function uploadLogo(req: Request, res: Response) {
  if (!req.file) {
    throw new ApiError(400, "ლოგო არ არის მიბმული");
  }

  const companyInfo = await companyInfoService.setCompanyLogo(req.file);
  res.status(200).json({ companyInfo });
}
