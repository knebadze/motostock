import type { Request, Response } from "express";
import * as emailTemplatesService from "./email-templates.service.js";
import type { UpdateEmailTemplateInput } from "./email-templates.schema.js";

export async function list(_req: Request, res: Response) {
  const items = await emailTemplatesService.listEmailTemplates();
  res.status(200).json({ items });
}

export async function update(
  req: Request<{ id: string }, unknown, UpdateEmailTemplateInput>,
  res: Response,
) {
  const item = await emailTemplatesService.updateEmailTemplate(Number(req.params.id), req.body);
  res.status(200).json({ item });
}
