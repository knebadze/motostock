import { Router } from "express";
import { validate } from "../../middleware/validate.middleware.js";
import { whatsappChatRateLimit } from "../../middleware/rateLimit.middleware.js";
import { registry } from "../../docs/registry.js";
import * as whatsappChatController from "./whatsapp-chat.controller.js";
import {
  chatSessionResponseSchema,
  postChatMessageResponseSchema,
  postChatMessageSchema,
} from "./whatsapp-chat.schema.js";

export const whatsappChatRouter = Router();

// Public — works for both logged-in users and guests via resolveChatOwner,
// same reasoning as product-views' recently-viewed endpoint.
whatsappChatRouter.post(
  "/messages",
  whatsappChatRateLimit,
  validate(postChatMessageSchema),
  whatsappChatController.postMessage,
);
whatsappChatRouter.get("/messages", whatsappChatController.getMessages);

// Meta-facing only — signature-verified inside the controller (POST) or
// verify-token-checked (GET), not requireAuth (Meta's servers can't
// authenticate as one of our users).
whatsappChatRouter.get("/webhook", whatsappChatController.verifyWebhook);
whatsappChatRouter.post("/webhook", whatsappChatController.receiveWebhook);

registry.registerPath({
  method: "post",
  path: "/whatsapp-chat/messages",
  tags: ["WhatsAppChat"],
  summary: "Send a chat message, relayed to the support rep's WhatsApp (public — guest or authenticated)",
  request: { body: { content: { "application/json": { schema: postChatMessageSchema } } } },
  responses: {
    200: {
      description: "Message relayed",
      content: { "application/json": { schema: postChatMessageResponseSchema } },
    },
  },
});

registry.registerPath({
  method: "get",
  path: "/whatsapp-chat/messages",
  tags: ["WhatsAppChat"],
  summary: "Get the caller's own chat thread (public — guest or authenticated)",
  responses: {
    200: {
      description: "Chat thread",
      content: { "application/json": { schema: chatSessionResponseSchema } },
    },
  },
});

registry.registerPath({
  method: "get",
  path: "/whatsapp-chat/webhook",
  tags: ["WhatsAppChat"],
  summary: "Meta webhook verification handshake (not for direct use)",
  responses: { 200: { description: "Verified" }, 403: { description: "Verify token mismatch" } },
});

registry.registerPath({
  method: "post",
  path: "/whatsapp-chat/webhook",
  tags: ["WhatsAppChat"],
  summary: "Meta webhook for inbound WhatsApp messages (not for direct use)",
  responses: { 200: { description: "Accepted" }, 403: { description: "Invalid signature" } },
});
