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

  // Written immediately before the send loop starts (see
  // newsletter-campaigns.service.ts's sendCampaign) — the double-send guard.
  updateStatus(id: number, status: NewsletterCampaignStatus) {
    return prisma.newsletterCampaign.update({ where: { id }, data: { status } });
  },

  finishSend(id: number, data: { status: NewsletterCampaignStatus; recipientCount: number; failedCount: number }) {
    return prisma.newsletterCampaign.update({ where: { id }, data: { ...data, sentAt: new Date() } });
  },
};
