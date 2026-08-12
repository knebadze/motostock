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

  findMany(where?: Prisma.NewsletterSubscriberWhereInput) {
    return prisma.newsletterSubscriber.findMany({ where, orderBy: { createdAt: "desc" } });
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
