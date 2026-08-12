import type { Request, Response } from "express";
import * as newsletterService from "./newsletter.service.js";
import type {
  ConfirmSubscriptionInput,
  ListSubscribersQuery,
  SubscribeInput,
  UnsubscribeInput,
} from "./newsletter.schema.js";

export async function subscribe(req: Request<unknown, unknown, SubscribeInput>, res: Response) {
  await newsletterService.subscribe(req.body.email);
  res.status(200).json({ ok: true });
}

export async function confirm(
  req: Request<unknown, unknown, ConfirmSubscriptionInput>,
  res: Response,
) {
  await newsletterService.confirmSubscription(req.body.token);
  res.status(200).json({ ok: true });
}

export async function unsubscribe(
  req: Request<unknown, unknown, UnsubscribeInput>,
  res: Response,
) {
  await newsletterService.unsubscribe(req.body.token);
  res.status(200).json({ ok: true });
}

export async function listSubscribers(
  req: Request<unknown, unknown, unknown, ListSubscribersQuery>,
  res: Response,
) {
  const items = await newsletterService.listSubscribers(req.query);
  res.status(200).json({ items });
}

export async function getSubscriberCounts(_req: Request, res: Response) {
  const counts = await newsletterService.getSubscriberCounts();
  res.status(200).json(counts);
}

export async function deleteSubscriber(req: Request<{ id: string }>, res: Response) {
  await newsletterService.deleteSubscriber(Number(req.params.id));
  res.status(204).send();
}
