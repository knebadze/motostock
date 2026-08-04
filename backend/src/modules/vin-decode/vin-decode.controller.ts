import type { Request, Response } from "express";
import { decodeVin } from "./vin-decode.service.js";
import type { DecodeVinInput } from "./vin-decode.schema.js";

export async function decode(req: Request<unknown, unknown, DecodeVinInput>, res: Response) {
  const result = await decodeVin(req.body);
  res.status(200).json({ result });
}
