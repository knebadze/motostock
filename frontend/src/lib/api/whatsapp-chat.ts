import { apiClient } from "./client";

export type WhatsAppChatMessageSender = "CUSTOMER" | "STAFF" | "SYSTEM";

export type WhatsAppChatMessage = {
  id: number;
  sender: WhatsAppChatMessageSender;
  body: string;
  createdAt: string;
};

export type WhatsAppChatThread = {
  sessionId: number | null;
  isOpenNow: boolean;
  messages: WhatsAppChatMessage[];
};

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
