import type { Request, Response } from "express";
import * as analyticsService from "./analytics.service.js";
import type { AnalyticsQuery } from "./analytics.schema.js";

export async function getOverview(
  req: Request<unknown, unknown, unknown, AnalyticsQuery>,
  res: Response,
) {
  const overview = await analyticsService.getAnalyticsOverview(req.query.dateFrom, req.query.dateTo);
  res.status(200).json(overview);
}
