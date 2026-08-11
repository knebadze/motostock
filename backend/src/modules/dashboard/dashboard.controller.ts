import type { Request, Response } from "express";
import * as dashboardService from "./dashboard.service.js";

export async function stats(_req: Request, res: Response) {
  const result = await dashboardService.getDashboardStats();
  res.status(200).json(result);
}
