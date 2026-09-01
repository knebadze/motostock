import { env } from "../config/env.js";
import { SITE_NAME } from "../config/site.js";
import { logger } from "./logger.js";
import { toAbsoluteUrl } from "./public-url.js";
import { getCompanyInfo } from "../modules/company-info/company-info.service.js";

const ACCENT_COLOR = "#d97706"; // light-mode --primary (globals.css) — email has no dark-mode handling

// Exported for email-templates.service.ts's renderText, which needs the
// same escaping for {{placeholder}} values (e.g. a customer's name) it
// substitutes into an HTML email body.
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Every system email (password reset, email verification, order-status
// notifications, newsletter confirm/campaign — see mailer.ts's
// sendTemplatedEmail, the single choke point all of them go through) gets
// wrapped in this shell, so none of them ship as a bare, unstyled HTML
// fragment. getCompanyInfo() is cached (see company-info.service.ts), so
// this costs nothing extra on the hot path; a lookup failure still lets the
// email send with a minimal shell rather than blocking it.
export async function wrapEmailHtml(bodyHtml: string): Promise<string> {
  let companyName = SITE_NAME;
  let logoUrl: string | null = null;
  let contactLine: string | null = null;

  try {
    const company = await getCompanyInfo();
    companyName = company.name || SITE_NAME;
    if (company.logoUrl && env.BACKEND_PUBLIC_URL) {
      logoUrl = toAbsoluteUrl(company.logoUrl, env.BACKEND_PUBLIC_URL.replace(/\/$/, ""));
    }
    contactLine = [company.street, company.phone].filter(Boolean).join(" · ") || null;
  } catch (err) {
    logger.error({ err }, "Failed to load company info for email shell — sending with a minimal shell");
  }

  const safeCompanyName = escapeHtml(companyName);
  const year = new Date().getFullYear();
  const headerHtml = logoUrl
    ? `<img src="${logoUrl}" alt="${safeCompanyName}" height="36" style="display:block;border:0;outline:none;max-height:36px;width:auto;" />`
    : `<span style="font-size:18px;font-weight:700;color:#111827;">${safeCompanyName}</span>`;

  return `<!DOCTYPE html>
<html lang="ka">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${safeCompanyName}</title>
  </head>
  <body style="margin:0;padding:0;background-color:#f4f4f5;font-family:Arial, Helvetica, sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:12px;overflow:hidden;">
            <tr>
              <td style="padding:24px 32px;border-bottom:2px solid ${ACCENT_COLOR};">
                ${headerHtml}
              </td>
            </tr>
            <tr>
              <td style="padding:32px;color:#111827;font-size:14px;line-height:1.6;">
                ${bodyHtml}
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px;background-color:#f9fafb;color:#6b7280;font-size:12px;line-height:1.5;">
                © ${year} ${safeCompanyName}. ყველა უფლება დაცულია.${contactLine ? ` — ${escapeHtml(contactLine)}` : ""}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}
