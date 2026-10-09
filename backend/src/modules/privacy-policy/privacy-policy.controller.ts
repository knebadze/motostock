import type { Request, Response } from "express";
import * as privacyPolicyService from "./privacy-policy.service.js";
import type { UpdatePrivacyPolicyInput } from "./privacy-policy.schema.js";

export async function getOne(_req: Request, res: Response) {
  const privacyPolicy = await privacyPolicyService.getPrivacyPolicy();
  res.status(200).json({ privacyPolicy });
}

export async function update(
  req: Request<unknown, unknown, UpdatePrivacyPolicyInput>,
  res: Response,
) {
  const privacyPolicy = await privacyPolicyService.updatePrivacyPolicy(req.body);
  res.status(200).json({ privacyPolicy });
}
