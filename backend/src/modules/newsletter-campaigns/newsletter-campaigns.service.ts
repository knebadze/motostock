import { env } from "../../config/env.js";
import { SITE_NAME } from "../../config/site.js";
import { ApiError } from "../../lib/ApiError.js";
import { isMailerConfigured, sendTemplatedEmail } from "../../lib/mailer.js";
import { logger } from "../../lib/logger.js";
import { newsletterRepository } from "../newsletter/newsletter.repository.js";
import { newsletterCampaignsRepository } from "./newsletter-campaigns.repository.js";
import type {
  CreateNewsletterCampaignInput,
  UpdateNewsletterCampaignInput,
} from "./newsletter-campaigns.schema.js";
import type { NewsletterCampaignStatus } from "../../generated/prisma/index.js";

type CampaignRow = {
  id: number;
  subject: string;
  body: string;
  status: NewsletterCampaignStatus;
  recipientCount: number;
  failedCount: number;
  sentAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

function toResponse(row: CampaignRow) {
  return {
    id: row.id,
    subject: row.subject,
    body: row.body,
    status: row.status,
    recipientCount: row.recipientCount,
    failedCount: row.failedCount,
    sentAt: row.sentAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

async function assertDraft(id: number): Promise<CampaignRow> {
  const campaign = await newsletterCampaignsRepository.findById(id);
  if (!campaign) {
    throw new ApiError(404, "კამპანია ვერ მოიძებნა");
  }
  if (campaign.status !== "DRAFT") {
    throw new ApiError(409, "მხოლოდ დაუგზავნელი (DRAFT) კამპანიის რედაქტირება/წაშლაა შესაძლებელი");
  }
  return campaign;
}

export async function listCampaigns() {
  const rows = await newsletterCampaignsRepository.findMany();
  return rows.map(toResponse);
}

export async function getCampaign(id: number) {
  const row = await newsletterCampaignsRepository.findById(id);
  if (!row) {
    throw new ApiError(404, "კამპანია ვერ მოიძებნა");
  }
  return toResponse(row);
}

export async function createCampaign(input: CreateNewsletterCampaignInput) {
  const row = await newsletterCampaignsRepository.create(input);
  return toResponse(row);
}

export async function updateCampaign(id: number, input: UpdateNewsletterCampaignInput) {
  await assertDraft(id);
  const row = await newsletterCampaignsRepository.update(id, input);
  return toResponse(row);
}

// Sent campaigns stay deletable too (see the Prisma model's comment) — this
// only blocks deleting one that's actively SENDING, to avoid pulling the row
// out from under sendCampaign's own loop below.
export async function deleteCampaign(id: number) {
  const campaign = await newsletterCampaignsRepository.findById(id);
  if (!campaign) {
    throw new ApiError(404, "კამპანია ვერ მოიძებნა");
  }
  if (campaign.status === "SENDING") {
    throw new ApiError(409, "კამპანია გაგზავნის პროცესშია — ვერ წაიშლება");
  }
  await newsletterCampaignsRepository.delete(id);
}

function buildCampaignEmail(campaign: Pick<CampaignRow, "subject" | "body">, unsubscribeToken: string) {
  const unsubscribeUrl = `${env.FRONTEND_ORIGIN}/newsletter/unsubscribe?token=${unsubscribeToken}`;
  return {
    subject: campaign.subject,
    html: `${campaign.body}
      <p style="margin-top:2rem;font-size:12px;color:#888;">
        ${SITE_NAME} — <a href="${unsubscribeUrl}">გამოწერის გაუქმება</a>
      </p>`,
  };
}

// Synchronous, not queued/fire-and-forget — a rare, deliberate admin action
// (not a hot path), same reasoning fina-sync.service.ts's runSync already
// documents for holding a request open across a slow operation. Status
// flips to SENDING via one atomic conditional update (claimForSending) as
// the double-send guard — see that repository method's comment — before
// the per-recipient loop starts; an individual recipient's send failure is
// caught and counted, not fatal to the whole batch — only an unexpected
// failure of the batch itself (e.g. the subscriber query failing) trips the
// outer catch and marks the campaign FAILED. Doesn't scale to a mailing list
// of thousands (no queue/backoff/retry) — fine at this store's size, would
// need real job infrastructure beyond that.
export async function sendCampaign(id: number) {
  if (!isMailerConfigured()) {
    throw new ApiError(400, "ელფოსტის გაგზავნა არ არის კონფიგურირებული");
  }

  const campaign = await newsletterCampaignsRepository.findById(id);
  if (!campaign) {
    throw new ApiError(404, "კამპანია ვერ მოიძებნა");
  }

  // The status check above (campaign.status !== "DRAFT") used to be the
  // whole guard, checked and then written as two separate statements — a
  // classic TOCTOU race letting two concurrent sends both pass it and both
  // email every subscriber. claimForSending re-checks DRAFT and flips to
  // SENDING as one atomic statement; count: 0 means another call already
  // won (or the campaign was never DRAFT to begin with).
  const claim = await newsletterCampaignsRepository.claimForSending(id);
  if (claim.count === 0) {
    throw new ApiError(409, "კამპანია უკვე გაგზავნილია ან გაგზავნის პროცესშია");
  }

  try {
    const subscribers = await newsletterRepository.findConfirmed();
    let failedCount = 0;

    for (const subscriber of subscribers) {
      const { subject, html } = buildCampaignEmail(campaign, subscriber.unsubscribeToken);
      try {
        await sendTemplatedEmail(subscriber.email, subject, html);
      } catch (err) {
        failedCount += 1;
        logger.error(
          { err, subscriberId: subscriber.id, campaignId: id },
          "Failed to send newsletter campaign email to one recipient",
        );
      }
    }

    const updated = await newsletterCampaignsRepository.finishSend(id, {
      status: "SENT",
      recipientCount: subscribers.length,
      failedCount,
    });
    return toResponse(updated);
  } catch (err) {
    await newsletterCampaignsRepository.updateStatus(id, "FAILED");
    logger.error({ err, campaignId: id }, "Newsletter campaign send failed entirely");
    throw err;
  }
}
