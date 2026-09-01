import nodemailer from "nodemailer";
import { env } from "../config/env.js";
import { SITE_NAME } from "../config/site.js";
import { wrapEmailHtml } from "./email-shell.js";

export function isMailerConfigured(): boolean {
  return Boolean(env.SMTP_HOST && env.SMTP_PORT && env.SMTP_USER && env.SMTP_PASSWORD && env.SMTP_FROM);
}

// Nodemailer's own defaults are minutes long (2min connect, 10min socket) —
// with no override here, a slow/unreachable SMTP host could hang whatever
// request-path caller awaited it (see requestPasswordReset below) for that
// long before failing. These bound every send to a few seconds worst case.
const SMTP_CONNECTION_TIMEOUT_MS = 10_000;
const SMTP_GREETING_TIMEOUT_MS = 10_000;
const SMTP_SOCKET_TIMEOUT_MS = 15_000;

function getTransport() {
  return nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE === "true",
    auth: { user: env.SMTP_USER, pass: env.SMTP_PASSWORD },
    connectionTimeout: SMTP_CONNECTION_TIMEOUT_MS,
    greetingTimeout: SMTP_GREETING_TIMEOUT_MS,
    socketTimeout: SMTP_SOCKET_TIMEOUT_MS,
  });
}

// Generic send used by both the hardcoded password-reset email below and
// the admin-editable EmailTemplate-driven sends (order placed/status
// changed — see email-templates.service.ts's renderEmailTemplate). Callers
// are responsible for checking isMailerConfigured() first if they want to
// skip sending gracefully instead of throwing.
export async function sendTemplatedEmail(to: string, subject: string, html: string): Promise<void> {
  const transport = getTransport();
  await transport.sendMail({ from: env.SMTP_FROM, to, subject, html: await wrapEmailHtml(html) });
}

export async function sendPasswordResetEmail(to: string, resetUrl: string): Promise<void> {
  await sendTemplatedEmail(
    to,
    `პაროლის აღდგენა — ${SITE_NAME}`,
    `
      <p>მიიღეთ ეს წერილი, რადგან თქვენი ანგარიშისთვის (${to}) პაროლის აღდგენა მოითხოვეთ ${SITE_NAME}-ზე.</p>
      <p><a href="${resetUrl}">დააჭირეთ აქ ახალი პაროლის დასაყენებლად</a></p>
      <p>ბმულის ვადა 1 საათშია. თუ ეს თხოვნა თქვენ არ გამოგზავნიათ, უბრალოდ დააიგნორეთ ეს წერილი.</p>
    `,
  );
}

export async function sendVerificationEmail(to: string, verifyUrl: string): Promise<void> {
  await sendTemplatedEmail(
    to,
    `დაადასტურეთ თქვენი ელფოსტა — ${SITE_NAME}`,
    `
      <p>მადლობთ, რომ დარეგისტრირდით ${SITE_NAME}-ზე!</p>
      <p><a href="${verifyUrl}">დააჭირეთ აქ ელფოსტის დასადასტურებლად</a></p>
      <p>დადასტურება საჭიროა შეკვეთის გასაფორმებლად. ბმულის ვადა 24 საათშია.</p>
    `,
  );
}
