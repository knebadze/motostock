import type { Request, Response } from "express";
import { errorLogsRepository } from "./error-logs.repository.js";
import type { ErrorLogsQuery } from "./error-logs.schema.js";

export async function list(
  req: Request<unknown, unknown, unknown, ErrorLogsQuery>,
  res: Response,
) {
  const page = req.query.page ?? 1;
  const pageSize = req.query.pageSize ?? 25;
  const [logs, total] = await Promise.all([
    errorLogsRepository.list((page - 1) * pageSize, pageSize),
    errorLogsRepository.count(),
  ]);
  res.status(200).json({ logs, total, page, pageSize });
}

export async function clear(_req: Request, res: Response) {
  await errorLogsRepository.clear();
  res.status(200).json({ message: "ჟურნალი გასუფთავდა" });
}
