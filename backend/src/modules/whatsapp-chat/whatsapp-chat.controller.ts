import type { Request, Response } from "express";
import { env } from "../../config/env.js";
import { logger } from "../../lib/logger.js";
import { verifyWebhookSignature } from "../../lib/whatsapp-cloud-api.js";
import { resolveChatOwner } from "./whatsapp-chat.middleware.js";
import { getChatForOwner, handleInboundStaffReply, postCustomerMessage } from "./whatsapp-chat.service.js";
import type { PostChatMessageInput } from "./whatsapp-chat.schema.js";

export async function postMessage(req: Request<unknown, unknown, PostChatMessageInput>, res: Response) {
  // Cast to the plain (unnarrowed) Request shape resolveChatOwner expects —
  // same req object at runtime, just a wider TS type than this handler's
  // body-schema-narrowed signature (same pattern as
  // product-views.controller.ts's getRecentlyViewed).
  const owner = await resolveChatOwner(req as unknown as Request, res);
  const result = await postCustomerMessage(owner, req.body.phone, req.body.text);
  res.status(200).json(result);
}

export async function getMessages(req: Request, res: Response) {
  const owner = await resolveChatOwner(req, res);
  const result = await getChatForOwner(owner);
  res.status(200).json(result);
}

// Meta calls this once (and again whenever the webhook config is re-saved)
// to confirm we control the callback URL — must echo back hub.challenge
// verbatim as plain text if hub.verify_token matches ours.
export function verifyWebhook(req: Request, res: Response) {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && env.WHATSAPP_WEBHOOK_VERIFY_TOKEN && token === env.WHATSAPP_WEBHOOK_VERIFY_TOKEN) {
    res.status(200).send(challenge);
    return;
  }
  res.status(403).end();
}

type WhatsAppWebhookMessage = {
  from?: string;
  type?: string;
  text?: { body?: string };
  context?: { id?: string };
};

// Meta's webhook payload nests one or more inbound messages several levels
// deep, and also delivers non-message events (delivery/read status) through
// the same endpoint — this pulls out just the text messages, defensively
// (any of these levels can be absent depending on the event type).
function extractInboundTextMessages(body: unknown): WhatsAppWebhookMessage[] {
  const entries = (body as { entry?: unknown })?.entry;
  if (!Array.isArray(entries)) return [];

  const messages: WhatsAppWebhookMessage[] = [];
  for (const entry of entries) {
    const changes = (entry as { changes?: unknown })?.changes;
    if (!Array.isArray(changes)) continue;
    for (const change of changes) {
      const value = (change as { value?: unknown })?.value;
      const valueMessages = (value as { messages?: unknown })?.messages;
      if (!Array.isArray(valueMessages)) continue;
      for (const message of valueMessages) {
        if ((message as WhatsAppWebhookMessage)?.type === "text") {
          messages.push(message as WhatsAppWebhookMessage);
        }
      }
    }
  }
  return messages;
}

export async function receiveWebhook(req: Request, res: Response) {
  const signature = req.headers["x-hub-signature-256"] as string | undefined;
  if (!req.rawBody || !verifyWebhookSignature(req.rawBody, signature)) {
    logger.warn("Rejected WhatsApp webhook call with an invalid or missing signature");
    res.status(403).end();
    return;
  }

  // Respond 200 immediately regardless of payload shape — Meta retries
  // (and can eventually disable the webhook) on anything but a fast 2xx;
  // processing failures are logged, not surfaced to Meta as a delivery
  // failure.
  res.status(200).end();

  try {
    const messages = extractInboundTextMessages(req.body);
    for (const message of messages) {
      const body = message.text?.body;
      if (!body) continue;
      await handleInboundStaffReply({ body, contextMessageId: message.context?.id });
    }
  } catch (err) {
    logger.error({ err }, "Failed to process an inbound WhatsApp webhook payload");
  }
}
