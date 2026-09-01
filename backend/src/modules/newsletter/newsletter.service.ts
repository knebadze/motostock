import crypto from "node:crypto";
import { env } from "../../config/env.js";
import { SITE_NAME } from "../../config/site.js";
import { ApiError } from "../../lib/ApiError.js";
import { isMailerConfigured, sendTemplatedEmail } from "../../lib/mailer.js";
import { newsletterRepository } from "./newsletter.repository.js";
import type { ListSubscribersQuery } from "./newsletter.schema.js";
import type { Prisma } from "../../generated/prisma/index.js";

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function generateRawToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

type SubscriberRow = {
  id: number;
  email: string;
  status: "PENDING" | "CONFIRMED" | "UNSUBSCRIBED";
  confirmedAt: Date | null;
  unsubscribedAt: Date | null;
  createdAt: Date;
};

function toResponse(row: SubscriberRow) {
  return {
    id: row.id,
    email: row.email,
    status: row.status,
    confirmedAt: row.confirmedAt,
    unsubscribedAt: row.unsubscribedAt,
    createdAt: row.createdAt,
  };
}

async function sendConfirmationEmail(email: string, rawToken: string) {
  const confirmUrl = `${env.FRONTEND_ORIGIN}/newsletter/confirm?token=${rawToken}`;
  await sendTemplatedEmail(
    email,
    `დაადასტურეთ გამოწერა — ${SITE_NAME}`,
    `<p>მადლობთ, რომ გამოიწერეთ ${SITE_NAME}-ის სიახლეები!</p>
     <p><a href="${confirmUrl}">დააჭირეთ აქ გამოწერის დასადასტურებლად</a></p>
     <p>თუ ეს თხოვნა თქვენ არ გამოგზავნიათ, უბრალოდ დააიგნორეთ ეს წერილი.</p>`,
  );
}

// Double opt-in entry point. Deliberately quiet/idempotent for every
// already-known state (matches auth.service.ts's requestPasswordReset
// reasoning for not leaking account existence, though the stakes here are
// lower — still no reason to let a signup form distinguish "new email" from
// "already subscribed" through its response):
//   - unknown email -> create PENDING + send confirmation
//   - PENDING (never confirmed) -> resend confirmation with a fresh token
//   - UNSUBSCRIBED -> reset to PENDING, resend confirmation
//   - CONFIRMED -> no-op
export async function subscribe(email: string): Promise<void> {
  if (!isMailerConfigured()) {
    throw new ApiError(400, "ელფოსტის გაგზავნა არ არის კონფიგურირებული", "MAIL_NOT_CONFIGURED");
  }

  const existing = await newsletterRepository.findByEmail(email);
  if (existing?.status === "CONFIRMED") {
    return;
  }

  const rawToken = generateRawToken();
  const confirmTokenHash = hashToken(rawToken);

  if (existing) {
    await newsletterRepository.resetForResubscribe(existing.id, confirmTokenHash);
  } else {
    await newsletterRepository.create({
      email,
      confirmTokenHash,
      unsubscribeToken: generateRawToken(),
    });
  }

  await sendConfirmationEmail(email, rawToken);
}

export async function confirmSubscription(token: string): Promise<void> {
  const subscriber = await newsletterRepository.findByConfirmTokenHash(hashToken(token));
  if (!subscriber) {
    throw new ApiError(400, "დადასტურების ბმული არასწორია ან უკვე გამოყენებულია", "NEWSLETTER_CONFIRM_LINK_INVALID");
  }

  await newsletterRepository.confirm(subscriber.id);
}

// Idempotent by design — an unsubscribe link stays embedded in every
// previously sent campaign, so clicking an old one after already
// unsubscribing must succeed quietly rather than error.
export async function unsubscribe(token: string): Promise<void> {
  const subscriber = await newsletterRepository.findByUnsubscribeToken(token);
  if (!subscriber) {
    throw new ApiError(400, "გამოწერის გაუქმების ბმული არასწორია", "NEWSLETTER_UNSUBSCRIBE_LINK_INVALID");
  }

  if (subscriber.status !== "UNSUBSCRIBED") {
    await newsletterRepository.unsubscribe(subscriber.id);
  }
}

function buildAdminWhere(filters: ListSubscribersQuery): Prisma.NewsletterSubscriberWhereInput | undefined {
  const and: Prisma.NewsletterSubscriberWhereInput[] = [];
  if (filters.status) and.push({ status: filters.status });
  if (filters.search) and.push({ email: { contains: filters.search, mode: "insensitive" } });
  return and.length > 0 ? { AND: and } : undefined;
}

export async function listSubscribers(filters: ListSubscribersQuery) {
  const rows = await newsletterRepository.findMany(buildAdminWhere(filters));
  return rows.map(toResponse);
}

export async function getSubscriberCounts() {
  const groups = await newsletterRepository.countByStatus();
  const counts = { pending: 0, confirmed: 0, unsubscribed: 0 };
  for (const group of groups) {
    if (group.status === "PENDING") counts.pending = group._count.status;
    else if (group.status === "CONFIRMED") counts.confirmed = group._count.status;
    else if (group.status === "UNSUBSCRIBED") counts.unsubscribed = group._count.status;
  }
  return counts;
}

export async function deleteSubscriber(id: number) {
  const existing = await newsletterRepository.findById(id);
  if (!existing) {
    throw new ApiError(404, "გამომწერი ვერ მოიძებნა");
  }
  await newsletterRepository.delete(id);
}
