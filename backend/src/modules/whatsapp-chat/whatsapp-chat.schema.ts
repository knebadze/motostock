import { z } from "zod";
import { registry } from "../../docs/registry.js";

const MAX_MESSAGE_LENGTH = 2000;

export const postChatMessageSchema = registry.register(
  "PostWhatsAppChatMessageInput",
  z.object({
    phone: z.string().trim().min(5).max(30).openapi({ example: "+995555123456" }),
    text: z.string().trim().min(1).max(MAX_MESSAGE_LENGTH).openapi({ example: "მაქვთ თუ არა ეს ზომა მარაგში?" }),
  }),
);
export type PostChatMessageInput = z.infer<typeof postChatMessageSchema>;

export const chatMessageResponseSchema = z.object({
  id: z.int(),
  sender: z.enum(["CUSTOMER", "STAFF", "SYSTEM"]),
  body: z.string(),
  createdAt: z.iso.datetime(),
});

export const chatSessionResponseSchema = registry.register(
  "WhatsAppChatSession",
  z.object({
    sessionId: z.int().nullable(),
    isOpenNow: z.boolean(),
    messages: z.array(chatMessageResponseSchema),
  }),
);

export const postChatMessageResponseSchema = registry.register(
  "PostWhatsAppChatMessageResult",
  z.object({
    sessionId: z.int(),
    isOpenNow: z.boolean(),
  }),
);
