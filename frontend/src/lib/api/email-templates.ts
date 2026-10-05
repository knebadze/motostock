import { apiClient } from "./client";
import type { components } from "./generated/schema";

// Response/input shapes below aliasing `Schemas[...]` are generated from the
// backend's OpenAPI document (npm run api:types → generated/schema.d.ts).
type Schemas = components["schemas"];

export type EmailTemplateKey =
  | "ORDER_PLACED"
  | "ORDER_CONFIRMED"
  | "ORDER_SHIPPED"
  | "ORDER_DELIVERED"
  | "ORDER_CANCELLED"
  | "NEW_ORDER_ADMIN"
  | "BIRTHDAY";

export type EmailTemplate = Schemas["EmailTemplate"];

export type UpdateEmailTemplateInput = Schemas["UpdateEmailTemplateInput"];

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
