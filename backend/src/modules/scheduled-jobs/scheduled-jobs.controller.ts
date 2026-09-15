import type { Request, Response } from "express";
import { listJobDefinitions, listJobRuns, runScheduledJob } from "./scheduled-jobs.service.js";
import type { ScheduledJobKeyParam, ScheduledJobRunsQuery } from "./scheduled-jobs.schema.js";

export async function list(_req: Request, res: Response) {
  const jobs = await listJobDefinitions();
  res.status(200).json({ jobs });
}

export async function listRuns(
  req: Request<unknown, unknown, unknown, ScheduledJobRunsQuery>,
  res: Response,
) {
  const { runs, total, page, pageSize } = await listJobRuns(req.query);
  res.status(200).json({ runs, total, page, pageSize });
}

// Admin-triggered manual run — mirrors fina-sync.controller.ts's `run`
// (synchronous: awaits completion and returns the finished row).
export async function runNow(req: Request<ScheduledJobKeyParam>, res: Response) {
  const run = await runScheduledJob(req.params.key, "MANUAL", req.user!.sub);
  res.status(200).json({ run });
}
