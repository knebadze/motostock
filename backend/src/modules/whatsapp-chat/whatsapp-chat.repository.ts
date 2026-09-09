import { prisma } from "../../config/prisma.js";
import type { WhatsAppMessageSender } from "../../generated/prisma/index.js";

export type ChatOwner = { userId: number } | { guestId: string };

function ownerWhere(owner: ChatOwner) {
  return "userId" in owner ? { userId: owner.userId } : { guestId: owner.guestId };
}

const messagesOrderedAsc = { messages: { orderBy: { createdAt: "asc" as const } } };

export const whatsappChatRepository = {
  // One conversation thread per owner — the caller reuses this across
  // messages instead of starting a new session every time (see
  // whatsapp-chat.service.ts's postCustomerMessage).
  findLatestSessionForOwner(owner: ChatOwner) {
    return prisma.whatsAppChatSession.findFirst({
      where: ownerWhere(owner),
      orderBy: { createdAt: "desc" },
      include: messagesOrderedAsc,
    });
  },

  createSession(owner: ChatOwner, customerPhone: string) {
    return prisma.whatsAppChatSession.create({
      data: { ...ownerWhere(owner), customerPhone },
      include: messagesOrderedAsc,
    });
  },

  updateCustomerPhone(sessionId: number, customerPhone: string) {
    return prisma.whatsAppChatSession.update({ where: { id: sessionId }, data: { customerPhone } });
  },

  findSessionById(sessionId: number) {
    return prisma.whatsAppChatSession.findUnique({ where: { id: sessionId } });
  },

  createMessage(sessionId: number, sender: WhatsAppMessageSender, body: string) {
    return prisma.whatsAppChatMessage.create({ data: { sessionId, sender, body } });
  },

  setRelayMessageId(messageId: number, relayWhatsAppMessageId: string) {
    return prisma.whatsAppChatMessage.update({ where: { id: messageId }, data: { relayWhatsAppMessageId } });
  },

  findMessageByRelayId(relayWhatsAppMessageId: string) {
    return prisma.whatsAppChatMessage.findUnique({ where: { relayWhatsAppMessageId } });
  },

  // Every message that isn't strictly ordered would break the widget's
  // rendered thread, so this is always ascending by createdAt.
  findMessagesForSession(sessionId: number) {
    return prisma.whatsAppChatMessage.findMany({ where: { sessionId }, orderBy: { createdAt: "asc" } });
  },

  // Fallback correlation for a STAFF reply with no reply/quote context (see
  // whatsapp-chat.service.ts's handleInboundStaffReply): sessions whose most
  // recent message is still CUSTOMER-sent, within a recency window — a
  // session already answered (last message STAFF/SYSTEM) isn't "awaiting a
  // reply" anymore. Small expected volume (a single rep, a handful of
  // concurrent conversations) makes filtering in application code simpler
  // and just as fast as a raw SQL DISTINCT ON here.
  async findSessionsAwaitingReply(since: Date) {
    const sessions = await prisma.whatsAppChatSession.findMany({
      where: { updatedAt: { gte: since } },
      include: messagesOrderedAsc,
    });
    return sessions.filter((session) => {
      const lastMessage = session.messages[session.messages.length - 1];
      return lastMessage?.sender === "CUSTOMER";
    });
  },

  // Merge-on-login support (see whatsapp-chat.service.ts's
  // mergeGuestChatIntoUser) — mirrors product-views.repository.ts's
  // findByGuestId/mergeGuestItem pattern.
  findSessionsByGuestId(guestId: string) {
    return prisma.whatsAppChatSession.findMany({ where: { guestId } });
  },

  // Claims a guest session onto `userId` — `updateMany` with the guestId
  // still in the WHERE clause makes this a safe no-op (count 0) if a
  // concurrent merge of the same guest cookie already claimed it, instead
  // of two callers both re-parenting the same row or one hitting a stale
  // read.
  async claimGuestSession(sessionId: number, guestId: string, userId: number) {
    const { count } = await prisma.whatsAppChatSession.updateMany({
      where: { id: sessionId, guestId },
      data: { userId, guestId: null },
    });
    return count > 0;
  },
};
