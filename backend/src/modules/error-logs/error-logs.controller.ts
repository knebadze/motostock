import type { Request, Response } from "express";
import { resolvePage } from "../../lib/pagination.js";
import { errorLogsRepository } from "./error-logs.repository.js";
import type { ErrorLogsQuery } from "./error-logs.schema.js";

export async function list(
  req: Request<unknown, unknown, unknown, ErrorLogsQuery>,
  res: Response,
) {
  const { page, pageSize, skip, take } = resolvePage(req.query, 25);
  const [logs, total] = await Promise.all([
    errorLogsRepository.list(skip, take),
    errorLogsRepository.count(),
  ]);
  res.status(200).json({ logs, total, page, pageSize });
}

export async function clear(_req: Request, res: Response) {
  await errorLogsRepository.clear();
  res.status(200).json({ message: "ჟურნალი გასუფთავდა" });
}
