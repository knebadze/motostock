import { prisma } from "../../config/prisma.js";
import type { WhatsAppMessageSender } from "../../generated/prisma/index.js";
import { isUniqueConstraintViolation } from "../../lib/prismaErrors.js";

const INBOUND_ID_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;
const INBOUND_ID_PRUNE_INTERVAL_MS = 60 * 60 * 1000;
let lastInboundIdPruneAt = 0;

export type ChatOwner = { userId: number } | { guestId: string };

function ownerWhere(owner: ChatOwner) {
  return "userId" in owner ? { userId: owner.userId } : { guestId: owner.guestId };
}

const messagesOrderedAsc = { messages: { orderBy: { createdAt: "asc" as const } } };

export const whatsappChatRepository = {
  // Records an inbound webhook message id; false when it was already
  // recorded (Meta re-delivered it) — the caller then skips it. The primary
  // key makes this atomic even for two concurrent deliveries of the same id.
  // Old ids are pruned at most hourly, piggybacking on this call.
  async recordInboundMessageId(messageId: string): Promise<boolean> {
    const now = Date.now();
    if (now - lastInboundIdPruneAt > INBOUND_ID_PRUNE_INTERVAL_MS) {
      lastInboundIdPruneAt = now;
      await prisma.whatsAppInboundMessage.deleteMany({
        where: { receivedAt: { lt: new Date(now - INBOUND_ID_RETENTION_MS) } },
      });
    }
    try {
      await prisma.whatsAppInboundMessage.create({ data: { messageId } });
      return true;
    } catch (error) {
      // A primary-key clash: Postgres names it "WhatsAppInboundMessage_pkey"
      // (no field name in it), so match on the table part.
      if (isUniqueConstraintViolation(error, "WhatsAppInboundMessage")) return false;
      throw error;
    }
  },

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

  // Atomic get-or-create keyed off the owner's unique constraint (see
  // whatsapp-chat.prisma) — replaces a prior findLatestSessionForOwner-then-
  // create sequence in postCustomerMessage that let two near-simultaneous
  // first messages from the same visitor both see "no session yet" and both
  // create one, splitting that visitor's conversation across two rows. An
  // existing row's customerPhone is left untouched here; the caller compares
  // and issues its own updateCustomerPhone when it differs. Branches on
  // owner shape because Prisma's generated `where` type only accepts the
  // field an @@unique actually names — same reasoning as
  // visitors.repository.ts's touchPresence.
  // No `include` on purpose: an upsert with a nested read can't use
  // Postgres's atomic INSERT … ON CONFLICT and degrades to read-then-insert,
  // so two near-simultaneous first messages from one visitor could both
  // insert and one fail on the unique owner (a 500). It also loaded the
  // visitor's entire message history on every message they posted, which
  // the caller never reads.
  findOrCreateSessionForOwner(owner: ChatOwner, customerPhone: string) {
    const create = { ...ownerWhere(owner), customerPhone };
    if ("userId" in owner) {
      return prisma.whatsAppChatSession.upsert({ where: { userId: owner.userId }, create, update: {} });
    }
    return prisma.whatsAppChatSession.upsert({ where: { guestId: owner.guestId }, create, update: {} });
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
  // mergeGuestChatIntoUser). At most one row per guestId now (see
  // whatsapp-chat.prisma's @@unique), so this is a lookup, not a list.
  findSessionByGuestId(guestId: string) {
    return prisma.whatsAppChatSession.findUnique({ where: { guestId } });
  },

  findSessionByUserId(userId: number) {
    return prisma.whatsAppChatSession.findUnique({ where: { userId } });
  },

  // Claims a guest session onto `userId` — `updateMany` with the guestId
  // still in the WHERE clause makes this a safe no-op (count 0) if a
  // concurrent merge of the same guest cookie already claimed it, instead
  // of two callers both re-parenting the same row or one hitting a stale
  // read. Only valid when `userId` has no session of its own yet — the
  // @@unique([userId]) constraint would reject this otherwise, which is why
  // mergeGuestChatIntoUser checks findSessionByUserId first and merges
  // messages instead when one already exists.
  async claimGuestSession(sessionId: number, guestId: string, userId: number) {
    const { count } = await prisma.whatsAppChatSession.updateMany({
      where: { id: sessionId, guestId },
      data: { userId, guestId: null },
    });
    return count > 0;
  },

  // Folds one session's messages onto another (see
  // mergeGuestChatIntoUser merging a guest thread into an account's
  // pre-existing one) and removes the now-empty source session.
  async mergeSessionInto(fromSessionId: number, toSessionId: number) {
    await prisma.whatsAppChatMessage.updateMany({
      where: { sessionId: fromSessionId },
      data: { sessionId: toSessionId },
    });
    await prisma.whatsAppChatSession.delete({ where: { id: fromSessionId } });
  },
};
