import nodemailer from "nodemailer";
import { env } from "../config/env.js";
import { SITE_NAME } from "../config/site.js";

export function isMailerConfigured(): boolean {
  return Boolean(env.SMTP_HOST && env.SMTP_PORT && env.SMTP_USER && env.SMTP_PASSWORD && env.SMTP_FROM);
}

function getTransport() {
  return nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE === "true",
    auth: { user: env.SMTP_USER, pass: env.SMTP_PASSWORD },
  });
}

// Generic send used by both the hardcoded password-reset email below and
// the admin-editable EmailTemplate-driven sends (order placed/status
// changed — see email-templates.service.ts's renderEmailTemplate). Callers
// are responsible for checking isMailerConfigured() first if they want to
// skip sending gracefully instead of throwing.
export async function sendTemplatedEmail(to: string, subject: string, html: string): Promise<void> {
  const transport = getTransport();
  await transport.sendMail({ from: env.SMTP_FROM, to, subject, html });
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
