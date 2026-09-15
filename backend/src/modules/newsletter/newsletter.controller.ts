import type { Request, Response } from "express";
import { ApiError } from "../../lib/ApiError.js";
import { getUserById } from "../users/users.service.js";
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

// Three "my"-prefixed actions below back the account-page toggle — always
// resolve the email from the authenticated session (getUserById), never
// from the request body, so a customer can only ever act on their own
// subscription.
export async function getMyStatus(req: Request, res: Response) {
  if (!req.user) {
    throw new ApiError(401, "Not authenticated", "NOT_AUTHENTICATED");
  }
  const user = await getUserById(req.user.sub);
  const status = await newsletterService.getMyStatus(user.email);
  res.status(200).json({ status });
}

export async function subscribeMe(req: Request, res: Response) {
  if (!req.user) {
    throw new ApiError(401, "Not authenticated", "NOT_AUTHENTICATED");
  }
  const user = await getUserById(req.user.sub);
  await newsletterService.subscribe(user.email);
  res.status(200).json({ ok: true });
}

export async function unsubscribeMe(req: Request, res: Response) {
  if (!req.user) {
    throw new ApiError(401, "Not authenticated", "NOT_AUTHENTICATED");
  }
  const user = await getUserById(req.user.sub);
  await newsletterService.unsubscribeByEmail(user.email);
  res.status(200).json({ ok: true });
}

export async function listSubscribers(
  req: Request<unknown, unknown, unknown, ListSubscribersQuery>,
  res: Response,
) {
  const result = await newsletterService.listSubscribers(req.query);
  res.status(200).json(result);
}

export async function getSubscriberCounts(_req: Request, res: Response) {
  const counts = await newsletterService.getSubscriberCounts();
  res.status(200).json(counts);
}

export async function deleteSubscriber(req: Request<{ id: string }>, res: Response) {
  await newsletterService.deleteSubscriber(Number(req.params.id));
  res.status(204).send();
}
