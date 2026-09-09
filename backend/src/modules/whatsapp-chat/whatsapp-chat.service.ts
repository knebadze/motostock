import { ApiError } from "../../lib/ApiError.js";
import { logger } from "../../lib/logger.js";
import {
  isWhatsAppCloudApiConfigured,
  normalizePhoneForWhatsApp,
  sendWhatsAppTextMessage,
} from "../../lib/whatsapp-cloud-api.js";
import { getCompanyInfo } from "../company-info/company-info.service.js";
import { getWhatsAppSupportPhoneNumber } from "../settings/settings.service.js";
import { whatsappChatRepository, type ChatOwner } from "./whatsapp-chat.repository.js";

const SERVICE_UNAVAILABLE_MESSAGE = "ეს სერვისი დროებით მიუწვდომელია, გთხოვთ სცადოთ მოგვიანებით";

const OFFLINE_SYSTEM_MESSAGE =
  "ამჟამად სამუშაო საათებში არ ვართ — შეტყობინება მიღებულია, გიპასუხებთ უახლოეს სამუშაო დღეს.";

// Sent back to the rep's own WhatsApp when an inbound reply can't be routed
// to a session (no reply/quote context, and more than one — or zero —
// conversations are currently awaiting a reply) — better than silently
// dropping it, so the rep immediately knows to retry with "Reply".
const UNMATCHED_REPLY_NUDGE =
  '❗️ ვერ დავადგინეთ რომელ საიტის საუბარს ეკუთვნის თქვენი ბოლო პასუხი — გთხოვთ, გამოიყენოთ "Reply" კონკრეტულ შეტყობინებას, რომელზეც პასუხობთ.';

// Sessions updated within this window count as candidates for the
// no-context-id fallback (see handleInboundStaffReply) — bounds the query,
// doesn't need to be exact.
const AWAITING_REPLY_WINDOW_MS = 48 * 60 * 60 * 1000;

async function assertConfigured(): Promise<string> {
  if (!isWhatsAppCloudApiConfigured()) {
    throw new ApiError(503, SERVICE_UNAVAILABLE_MESSAGE);
  }
  const supportPhoneNumber = await getWhatsAppSupportPhoneNumber();
  if (!supportPhoneNumber) {
    throw new ApiError(503, SERVICE_UNAVAILABLE_MESSAGE);
  }
  return supportPhoneNumber;
}

function relayBodyFor(sessionId: number, phone: string, text: string): string {
  return `🌐 საიტის შეტყობინება #${sessionId} (ტელ: ${phone}):\n${text}`;
}

// Relays a CUSTOMER message to the support rep's own WhatsApp — the rep
// replies from their normal WhatsApp app (see handleInboundStaffReply for
// the other half). A relay-send failure doesn't fail the customer's
// request (their message is still saved and visible), it's just logged —
// same "best effort, don't break the user-facing action" reasoning as
// newsletter.service.ts's fire-and-forget email send.
export async function postCustomerMessage(owner: ChatOwner, phone: string, text: string) {
  const supportPhoneNumber = await assertConfigured();

  let session = await whatsappChatRepository.findLatestSessionForOwner(owner);
  if (!session) {
    session = await whatsappChatRepository.createSession(owner, phone);
  } else if (session.customerPhone !== phone) {
    await whatsappChatRepository.updateCustomerPhone(session.id, phone);
  }

  const customerMessage = await whatsappChatRepository.createMessage(session.id, "CUSTOMER", text);

  try {
    const relayId = await sendWhatsAppTextMessage(
      normalizePhoneForWhatsApp(supportPhoneNumber),
      relayBodyFor(session.id, phone, text),
    );
    await whatsappChatRepository.setRelayMessageId(customerMessage.id, relayId);
  } catch (err) {
    logger.error({ err, sessionId: session.id }, "Failed to relay WhatsApp chat message to support rep");
  }

  const { isOpenNow } = await getCompanyInfo();
  if (!isOpenNow) {
    await whatsappChatRepository.createMessage(session.id, "SYSTEM", OFFLINE_SYSTEM_MESSAGE);
  }

  return { sessionId: session.id, isOpenNow };
}

export async function getChatForOwner(owner: ChatOwner) {
  const session = await whatsappChatRepository.findLatestSessionForOwner(owner);
  const { isOpenNow } = await getCompanyInfo();

  if (!session) {
    return { sessionId: null, isOpenNow, messages: [] };
  }

  return {
    sessionId: session.id,
    isOpenNow,
    messages: session.messages.map((message) => ({
      id: message.id,
      sender: message.sender,
      body: message.body,
      createdAt: message.createdAt,
    })),
  };
}

// Inbound message FROM the support rep's own WhatsApp number — matched back
// to a session via the WhatsApp "Reply" (quote) the rep used, or (if they
// didn't quote) the single session currently awaiting a reply, if there's
// exactly one.
export async function handleInboundStaffReply(params: { body: string; contextMessageId?: string }) {
  let sessionId: number | null = null;

  if (params.contextMessageId) {
    const originalMessage = await whatsappChatRepository.findMessageByRelayId(params.contextMessageId);
    if (originalMessage) sessionId = originalMessage.sessionId;
  }

  if (sessionId == null) {
    const since = new Date(Date.now() - AWAITING_REPLY_WINDOW_MS);
    const awaiting = await whatsappChatRepository.findSessionsAwaitingReply(since);
    if (awaiting.length === 1) sessionId = awaiting[0].id;
  }

  if (sessionId == null) {
    await nudgeSupportRep();
    return;
  }

  await whatsappChatRepository.createMessage(sessionId, "STAFF", params.body);
}

async function nudgeSupportRep() {
  const supportPhoneNumber = await getWhatsAppSupportPhoneNumber();
  if (!supportPhoneNumber) return;
  try {
    await sendWhatsAppTextMessage(normalizePhoneForWhatsApp(supportPhoneNumber), UNMATCHED_REPLY_NUDGE);
  } catch (err) {
    logger.error({ err }, "Failed to send the unmatched-WhatsApp-reply nudge to the support rep");
  }
}

// Merge-on-login support, mirroring product-views.service.ts's
// mergeGuestProductViewsIntoUser — folds every guest-owned chat session
// into the now-known account instead of leaving it stranded under a
// guestId cookie that's about to be cleared.
export async function mergeGuestChatIntoUser(guestId: string, userId: number) {
  const sessions = await whatsappChatRepository.findSessionsByGuestId(guestId);
  for (const session of sessions) {
    await whatsappChatRepository.claimGuestSession(session.id, guestId, userId);
  }
}
