import { ApiError } from "../../lib/ApiError.js";
import { isMailerConfigured, sendTemplatedEmail } from "../../lib/mailer.js";
import { escapeHtml } from "../../lib/email-shell.js";
import { logger } from "../../lib/logger.js";
import { emailTemplatesRepository } from "./email-templates.repository.js";
import type { UpdateEmailTemplateInput } from "./email-templates.schema.js";
import type { EmailTemplateKey } from "../../generated/prisma/index.js";

type EmailTemplateRow = {
  id: number;
  key: EmailTemplateKey;
  subjectKa: string;
  subjectEn: string;
  subjectRu: string;
  bodyKa: string;
  bodyEn: string;
  bodyRu: string;
  createdAt: Date;
  updatedAt: Date;
};

// Defaults used only the first time each row is bootstrapped — after that,
// whatever the admin has saved always wins. {{placeholder}} tokens get
// substituted at send time (see renderEmailTemplate below); the set
// available to every one of these keys today is customerName/orderCode/
// total.
const DEFAULTS: Record<
  EmailTemplateKey,
  { subjectKa: string; subjectEn: string; subjectRu: string; bodyKa: string; bodyEn: string; bodyRu: string }
> = {
  ORDER_PLACED: {
    subjectKa: "თქვენი შეკვეთა მიღებულია — {{orderCode}}",
    subjectEn: "Your order has been received — {{orderCode}}",
    subjectRu: "Ваш заказ принят — {{orderCode}}",
    bodyKa: "<p>გამარჯობა, {{customerName}}!</p><p>თქვენი შეკვეთა #{{orderCode}} მიღებულია და მუშავდება. ჯამური თანხა: {{total}} ₾.</p><p>მადლობას გიხდით შეძენისთვის!</p>",
    bodyEn: "<p>Hi {{customerName}},</p><p>Your order #{{orderCode}} has been received and is being processed. Total: {{total}} GEL.</p><p>Thank you for your purchase!</p>",
    bodyRu: "<p>Здравствуйте, {{customerName}}!</p><p>Ваш заказ №{{orderCode}} принят и обрабатывается. Сумма: {{total}} GEL.</p><p>Спасибо за покупку!</p>",
  },
  ORDER_CONFIRMED: {
    subjectKa: "შეკვეთა დადასტურებულია — {{orderCode}}",
    subjectEn: "Order confirmed — {{orderCode}}",
    subjectRu: "Заказ подтверждён — {{orderCode}}",
    bodyKa: "<p>გამარჯობა, {{customerName}}!</p><p>თქვენი შეკვეთა #{{orderCode}} დადასტურებულია.</p>",
    bodyEn: "<p>Hi {{customerName}},</p><p>Your order #{{orderCode}} has been confirmed.</p>",
    bodyRu: "<p>Здравствуйте, {{customerName}}!</p><p>Ваш заказ №{{orderCode}} подтверждён.</p>",
  },
  ORDER_SHIPPED: {
    subjectKa: "შეკვეთა გზაშია — {{orderCode}}",
    subjectEn: "Order out for delivery — {{orderCode}}",
    subjectRu: "Заказ у курьера — {{orderCode}}",
    bodyKa: "<p>გამარჯობა, {{customerName}}!</p><p>თქვენი შეკვეთა #{{orderCode}} კურიერთანაა და მალე მიგეწოდებათ.</p>",
    bodyEn: "<p>Hi {{customerName}},</p><p>Your order #{{orderCode}} is out for delivery.</p>",
    bodyRu: "<p>Здравствуйте, {{customerName}}!</p><p>Ваш заказ №{{orderCode}} передан курьеру.</p>",
  },
  ORDER_DELIVERED: {
    subjectKa: "შეკვეთა ჩაბარებულია — {{orderCode}}",
    subjectEn: "Order delivered — {{orderCode}}",
    subjectRu: "Заказ доставлен — {{orderCode}}",
    bodyKa: "<p>გამარჯობა, {{customerName}}!</p><p>თქვენი შეკვეთა #{{orderCode}} ჩაბარებულია. მადლობას გიხდით!</p>",
    bodyEn: "<p>Hi {{customerName}},</p><p>Your order #{{orderCode}} has been delivered. Thank you!</p>",
    bodyRu: "<p>Здравствуйте, {{customerName}}!</p><p>Ваш заказ №{{orderCode}} доставлен. Спасибо!</p>",
  },
  ORDER_CANCELLED: {
    subjectKa: "შეკვეთა გაუქმებულია — {{orderCode}}",
    subjectEn: "Order cancelled — {{orderCode}}",
    subjectRu: "Заказ отменён — {{orderCode}}",
    bodyKa: "<p>გამარჯობა, {{customerName}}!</p><p>თქვენი შეკვეთა #{{orderCode}} გაუქმებულია. კითხვების შემთხვევაში დაგვიკავშირდით.</p>",
    bodyEn: "<p>Hi {{customerName}},</p><p>Your order #{{orderCode}} has been cancelled. Contact us if you have any questions.</p>",
    bodyRu: "<p>Здравствуйте, {{customerName}}!</p><p>Ваш заказ №{{orderCode}} отменён. Свяжитесь с нами, если у вас есть вопросы.</p>",
  },
};

const ALL_KEYS: EmailTemplateKey[] = [
  "ORDER_PLACED",
  "ORDER_CONFIRMED",
  "ORDER_SHIPPED",
  "ORDER_DELIVERED",
  "ORDER_CANCELLED",
];

function toResponse(row: EmailTemplateRow) {
  return {
    id: row.id,
    key: row.key,
    subject: { ka: row.subjectKa, en: row.subjectEn, ru: row.subjectRu },
    body: { ka: row.bodyKa, en: row.bodyEn, ru: row.bodyRu },
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

// Singleton-per-key bootstrap — creates the fixed rows (one per
// EmailTemplateKey) on first access instead of a seed script, same pattern
// as HomepageSection/CompanyInfo. Admin never creates/deletes these rows
// directly.
async function ensureBootstrapped(): Promise<void> {
  for (const key of ALL_KEYS) {
    const existing = await emailTemplatesRepository.findByKey(key);
    if (existing) continue;

    const defaults = DEFAULTS[key];
    await emailTemplatesRepository.create({ key, ...defaults });
  }
}

export async function listEmailTemplates() {
  await ensureBootstrapped();
  const rows = await emailTemplatesRepository.findMany();
  return rows.map(toResponse);
}

export async function updateEmailTemplate(id: number, input: UpdateEmailTemplateInput) {
  const existing = await emailTemplatesRepository.findById(id);
  if (!existing) {
    throw new ApiError(404, "შაბლონი ვერ მოიძებნა");
  }

  const row = await emailTemplatesRepository.update(id, {
    subjectKa: input.subject.ka,
    subjectEn: input.subject.en,
    subjectRu: input.subject.ru,
    bodyKa: input.body.ka,
    bodyEn: input.body.en,
    bodyRu: input.body.ru,
  });
  return toResponse(row);
}

// `escape` must be true for the HTML body — vars can include user-controlled
// text (customerName, taken straight from the order's firstName/lastName,
// which has no character restriction beyond a length range — see
// auth.schema.ts) substituted directly into an HTML template, so an
// unescaped value would let a customer inject markup into their own
// order-status emails. The subject is a plain-text mail header, never
// HTML-rendered, so it's left as-is (escaping it would show literal
// "&amp;" etc. to the recipient for no security benefit).
function renderText(text: string, vars: Record<string, string>, escape: boolean): string {
  return text.replace(/\{\{(\w+)\}\}/g, (match, name: string) => {
    const value = vars[name];
    if (value === undefined) return match;
    return escape ? escapeHtml(value) : value;
  });
}

// Sends one of the fixed EmailTemplate rows to `to`, with {{placeholder}}
// substitution — the single entry point orders.service.ts uses for both
// the order-placed confirmation and the per-status-change notifications.
// Silently no-ops (logs, doesn't throw) when the mailer isn't configured or
// the send fails, so a missing SMTP setup or a transient email error never
// blocks placing/updating an order.
//
// Always sent in Georgian — no per-user language preference exists
// anywhere in this codebase yet (see the User model), same as the
// pre-existing password-reset email, until that changes.
export async function sendEmailTemplate(
  key: EmailTemplateKey,
  to: string,
  vars: Record<string, string>,
): Promise<void> {
  if (!isMailerConfigured()) return;

  try {
    await ensureBootstrapped();
    const row = await emailTemplatesRepository.findByKey(key);
    if (!row) return;

    await sendTemplatedEmail(
      to,
      renderText(row.subjectKa, vars, false),
      renderText(row.bodyKa, vars, true),
    );
  } catch (err) {
    logger.error({ err, key }, "Failed to send templated email");
  }
}
