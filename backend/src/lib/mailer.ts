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

export async function sendPasswordResetEmail(to: string, resetUrl: string): Promise<void> {
  const transport = getTransport();
  await transport.sendMail({
    from: env.SMTP_FROM,
    to,
    subject: `პაროლის აღდგენა — ${SITE_NAME}`,
    html: `
      <p>მიიღეთ ეს წერილი, რადგან თქვენი ანგარიშისთვის (${to}) პაროლის აღდგენა მოითხოვეთ ${SITE_NAME}-ზე.</p>
      <p><a href="${resetUrl}">დააჭირეთ აქ ახალი პაროლის დასაყენებლად</a></p>
      <p>ბმულის ვადა 1 საათშია. თუ ეს თხოვნა თქვენ არ გამოგზავნიათ, უბრალოდ დააიგნორეთ ეს წერილი.</p>
    `,
  });
}
