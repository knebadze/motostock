import type { Request, Response } from "express";
import { cache } from "../../lib/cache.js";

export function list(_req: Request, res: Response) {
  const entries = cache.list();
  res.status(200).json({ entries, count: entries.length });
}

export function clear(_req: Request, res: Response) {
  cache.clear();
  res.status(200).json({ message: "ქეში გასუფთავდა" });
}
