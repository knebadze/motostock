import type { Request, Response } from "express";
import * as fraudService from "./fraud.service.js";

export async function getSuspiciousLoginActivity(_req: Request, res: Response) {
  const result = await fraudService.listSuspiciousLoginActivity();
  res.status(200).json(result);
}
