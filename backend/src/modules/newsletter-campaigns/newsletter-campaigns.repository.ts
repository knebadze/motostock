import { prisma } from "../../config/prisma.js";
import type { NewsletterCampaignStatus } from "../../generated/prisma/index.js";

export const newsletterCampaignsRepository = {
  findMany() {
    return prisma.newsletterCampaign.findMany({ orderBy: { createdAt: "desc" } });
  },

  findById(id: number) {
    return prisma.newsletterCampaign.findUnique({ where: { id } });
  },

  create(data: { subject: string; body: string }) {
    return prisma.newsletterCampaign.create({ data });
  },

  update(id: number, data: { subject: string; body: string }) {
    return prisma.newsletterCampaign.update({ where: { id }, data });
  },

  delete(id: number) {
    return prisma.newsletterCampaign.delete({ where: { id } });
  },

  // Used for the FAILED transition in sendCampaign's catch — by that point
  // only one process can be inside the send loop at all (claimForSending
  // below already made sure of that), so this doesn't need to be atomic.
  updateStatus(id: number, status: NewsletterCampaignStatus) {
    return prisma.newsletterCampaign.update({ where: { id }, data: { status } });
  },

  // Atomically flips DRAFT -> SENDING, but only if it's still DRAFT — the
  // returned count tells the caller whether *this* call actually won the
  // transition (see newsletter-campaigns.service.ts's sendCampaign). Two
  // concurrent sendCampaign calls for the same campaign (a double-clicked
  // Send button, two admin tabs) can both read status: "DRAFT" via an
  // earlier findById before either commits; only one of them wins this
  // single UPDATE ... WHERE status = 'DRAFT', since Postgres serializes
  // concurrent writes to the same row and the loser's WHERE clause no
  // longer matches once the winner's update has committed.
  claimForSending(id: number) {
    return prisma.newsletterCampaign.updateMany({
      where: { id, status: "DRAFT" },
      data: { status: "SENDING" },
    });
  },

  finishSend(id: number, data: { status: NewsletterCampaignStatus; recipientCount: number; failedCount: number }) {
    return prisma.newsletterCampaign.update({ where: { id }, data: { ...data, sentAt: new Date() } });
  },
};
