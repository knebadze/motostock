import { createHmac, timingSafeEqual } from "node:crypto";
import { env } from "../config/env.js";
import { logger } from "./logger.js";

export function isWhatsAppCloudApiConfigured(): boolean {
  return Boolean(env.WHATSAPP_ACCESS_TOKEN && env.WHATSAPP_PHONE_NUMBER_ID);
}

// Cloud API's `to` field wants digits only (country code + number, no
// leading `+`, no spaces/dashes) — same stripping frontend's lib/whatsapp.ts
// already does for its wa.me link.
export function normalizePhoneForWhatsApp(phone: string): string {
  return phone.replace(/\D/g, "");
}

const GRAPH_API_VERSION = "v21.0";

// Sends a plain-text WhatsApp message from the business's Cloud-API number
// to `to` (E.164, digits only, no leading +) and returns the WhatsApp
// message id Meta assigns it — callers store this id so a later "Reply"
// (quote) to this exact message can be matched back via the webhook's
// `context.id` (see whatsapp-chat.service.ts).
export async function sendWhatsAppTextMessage(to: string, body: string): Promise<string> {
  const url = `https://graph.facebook.com/${GRAPH_API_VERSION}/${env.WHATSAPP_PHONE_NUMBER_ID}/messages`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.WHATSAPP_ACCESS_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    logger.error({ status: response.status, body: errorText, to }, "WhatsApp Cloud API send failed");
    throw new Error(`WhatsApp send failed with status ${response.status}`);
  }

  const data = (await response.json()) as { messages?: { id?: string }[] };
  const messageId = data.messages?.[0]?.id;
  if (!messageId) {
    throw new Error("WhatsApp Cloud API response missing message id");
  }
  return messageId;
}

// Meta signs every webhook POST body with HMAC-SHA256 of the raw (pre-JSON-
// parse) bytes, keyed by the App Secret — without this check, anyone who
// discovers the webhook URL could POST a fake payload impersonating a
// "staff reply" into an arbitrary customer's chat session. Requires
// WHATSAPP_APP_SECRET; the caller (whatsapp-chat.controller.ts) rejects the
// request outright if it's unset, same "dormant until configured" spirit as
// isWhatsAppCloudApiConfigured.
export function verifyWebhookSignature(rawBody: Buffer, signatureHeader: string | undefined): boolean {
  if (!env.WHATSAPP_APP_SECRET || !signatureHeader?.startsWith("sha256=")) return false;
  const expected = createHmac("sha256", env.WHATSAPP_APP_SECRET).update(rawBody).digest("hex");
  const provided = signatureHeader.slice("sha256=".length);
  if (expected.length !== provided.length) return false;
  return timingSafeEqual(Buffer.from(expected), Buffer.from(provided));
}
