import { prisma } from "../../config/prisma.js";
import type { Prisma } from "../../generated/prisma/index.js";

export const newsletterRepository = {
  findByEmail(email: string) {
    return prisma.newsletterSubscriber.findUnique({ where: { email } });
  },

  findByConfirmTokenHash(confirmTokenHash: string) {
    return prisma.newsletterSubscriber.findUnique({ where: { confirmTokenHash } });
  },

  findByUnsubscribeToken(unsubscribeToken: string) {
    return prisma.newsletterSubscriber.findUnique({ where: { unsubscribeToken } });
  },

  create(data: { email: string; confirmTokenHash: string; unsubscribeToken: string }) {
    return prisma.newsletterSubscriber.create({ data });
  },

  // Re-subscribing after UNSUBSCRIBED (or re-requesting confirmation while
  // still PENDING) reuses the same row instead of erroring on the unique
  // email constraint.
  resetForResubscribe(id: number, confirmTokenHash: string) {
    return prisma.newsletterSubscriber.update({
      where: { id },
      data: { status: "PENDING", confirmTokenHash, confirmedAt: null, unsubscribedAt: null },
    });
  },

  confirm(id: number) {
    return prisma.newsletterSubscriber.update({
      where: { id },
      data: { status: "CONFIRMED", confirmTokenHash: null, confirmedAt: new Date() },
    });
  },

  unsubscribe(id: number) {
    return prisma.newsletterSubscriber.update({
      where: { id },
      data: { status: "UNSUBSCRIBED", unsubscribedAt: new Date() },
    });
  },

  // Real server-side pagination (skip/take) — see newsletter.service.ts's
  // listSubscribers. Shared `where` between this and count() below so the
  // two never drift apart, same pattern as users.repository.ts's
  // searchWhere.
  findMany(where: Prisma.NewsletterSubscriberWhereInput | undefined, skip: number, take: number) {
    return prisma.newsletterSubscriber.findMany({ where, orderBy: { createdAt: "desc" }, skip, take });
  },

  count(where?: Prisma.NewsletterSubscriberWhereInput) {
    return prisma.newsletterSubscriber.count({ where });
  },

  countByStatus() {
    return prisma.newsletterSubscriber.groupBy({ by: ["status"], _count: { status: true } });
  },

  // Recipients for a campaign send — see newsletter-campaigns.service.ts.
  findConfirmed() {
    return prisma.newsletterSubscriber.findMany({ where: { status: "CONFIRMED" } });
  },

  findById(id: number) {
    return prisma.newsletterSubscriber.findUnique({ where: { id } });
  },

  delete(id: number) {
    return prisma.newsletterSubscriber.delete({ where: { id } });
  },
};
