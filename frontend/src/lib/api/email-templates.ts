import { apiClient } from "./client";
import type { LocalizedString } from "./categories";

export type EmailTemplateKey =
  | "ORDER_PLACED"
  | "ORDER_CONFIRMED"
  | "ORDER_SHIPPED"
  | "ORDER_DELIVERED"
  | "ORDER_CANCELLED";

export type EmailTemplate = {
  id: number;
  key: EmailTemplateKey;
  subject: LocalizedString;
  body: LocalizedString;
  createdAt: string;
  updatedAt: string;
};

export type UpdateEmailTemplateInput = {
  subject: LocalizedString;
  body: LocalizedString;
};

export async function listEmailTemplates(): Promise<EmailTemplate[]> {
  const { data } = await apiClient.get<{ items: EmailTemplate[] }>("/email-templates");
  return data.items;
}

export async function updateEmailTemplate(
  id: number,
  input: UpdateEmailTemplateInput,
): Promise<EmailTemplate> {
  const { data } = await apiClient.patch<{ item: EmailTemplate }>(
    `/email-templates/${id}`,
    input,
  );
  return data.item;
}
