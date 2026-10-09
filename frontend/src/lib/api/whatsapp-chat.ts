import { apiClient } from "./client";
import type { components } from "./generated/schema";

// Response/input shapes below aliasing `Schemas[...]` are generated from the
// backend's OpenAPI document (npm run api:types → generated/schema.d.ts).
type Schemas = components["schemas"];

export type WhatsAppChatMessageSender = "CUSTOMER" | "STAFF" | "SYSTEM";

export type WhatsAppChatMessage = WhatsAppChatThread["messages"][number];

export type WhatsAppChatThread = Schemas["WhatsAppChatSession"];

export async function getWhatsAppChatThread(): Promise<WhatsAppChatThread> {
  const { data } = await apiClient.get<WhatsAppChatThread>("/whatsapp-chat/messages");
  return data;
}

export async function sendWhatsAppChatMessage(
  phone: string,
  text: string,
): Promise<{ sessionId: number; isOpenNow: boolean }> {
  const { data } = await apiClient.post<{ sessionId: number; isOpenNow: boolean }>("/whatsapp-chat/messages", {
    phone,
    text,
  });
  return data;
}
