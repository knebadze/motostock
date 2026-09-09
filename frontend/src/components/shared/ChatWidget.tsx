"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useLocale, useTranslations } from "next-intl";
import type { Faq } from "@/lib/api/faq";
import { ApiRequestError } from "@/lib/api/client";
import {
  getWhatsAppChatThread,
  sendWhatsAppChatMessage,
  type WhatsAppChatMessage,
} from "@/lib/api/whatsapp-chat";
import { COOKIE_NOTICE_DISMISSED_EVENT, COOKIE_NOTICE_STORAGE_KEY } from "./CookieNotice";

// Shares the bottom-right corner with ScrollToTopButton — that component
// listens for this to hide itself while the chat panel is open, since an
// open panel is much taller than the two buttons' fixed vertical offset
// stacking can account for on its own.
export const CHAT_WIDGET_OPEN_CHANGED_EVENT = "motostock:chat-widget-open-changed";

const POLL_INTERVAL_MS = 5000;

function chatIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="size-5">
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5Z" />
    </svg>
  );
}

function closeIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="size-4">
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

// The rep never messages the customer directly — every reply is relayed
// through the site chat (see backend's whatsapp-chat module) — so this
// widget only ever talks to our own API, never wa.me/Meta directly.
function WhatsAppThread({ messages }: { messages: WhatsAppChatMessage[] }) {
  const locale = useLocale();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  return (
    <div className="flex flex-col gap-2">
      {messages.map((message) => {
        if (message.sender === "SYSTEM") {
          return (
            <p key={message.id} className="rounded-lg bg-muted px-3 py-2 text-center text-xs text-muted-foreground">
              {message.body}
            </p>
          );
        }
        const isCustomer = message.sender === "CUSTOMER";
        return (
          <div key={message.id} className={`flex ${isCustomer ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                isCustomer ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
              }`}
            >
              {message.body}
              <div className={`mt-1 text-[10px] opacity-70`}>
                {new Date(message.createdAt).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" })}
              </div>
            </div>
          </div>
        );
      })}
      <div ref={bottomRef} />
    </div>
  );
}

export function ChatWidget({
  faqs,
  whatsappChatEnabled,
}: {
  faqs: Faq[];
  whatsappChatEnabled: boolean;
}) {
  const t = useTranslations("ChatWidget");
  const locale = useLocale() as "ka" | "en" | "ru";
  const [open, setOpen] = useState(false);
  const [openQuestionId, setOpenQuestionId] = useState<number | null>(null);
  const [view, setView] = useState<"faq" | "whatsapp">("faq");
  // Same "stay clear of CookieNotice's fixed bottom bar" tracking as
  // ScrollToTopButton.tsx.
  const [cookieNoticeVisible, setCookieNoticeVisible] = useState(false);

  const [sessionId, setSessionId] = useState<number | null>(null);
  const [isOpenNow, setIsOpenNow] = useState(true);
  const [messages, setMessages] = useState<WhatsAppChatMessage[]>([]);
  const [phone, setPhone] = useState("");
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [threadLoaded, setThreadLoaded] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCookieNoticeVisible(!window.localStorage.getItem(COOKIE_NOTICE_STORAGE_KEY));
    function handleDismissed() {
      setCookieNoticeVisible(false);
    }
    window.addEventListener(COOKIE_NOTICE_DISMISSED_EVENT, handleDismissed);
    return () => window.removeEventListener(COOKIE_NOTICE_DISMISSED_EVENT, handleDismissed);
  }, []);

  useEffect(() => {
    window.dispatchEvent(new CustomEvent(CHAT_WIDGET_OPEN_CHANGED_EVENT, { detail: { open } }));
  }, [open]);

  async function refreshThread() {
    try {
      const thread = await getWhatsAppChatThread();
      setSessionId(thread.sessionId);
      setIsOpenNow(thread.isOpenNow);
      setMessages(thread.messages);
      return thread;
    } catch {
      return null;
    } finally {
      setThreadLoaded(true);
    }
  }

  // On first open, check whether a conversation already exists (e.g. the
  // visitor closed and reopened the widget, or came back later hoping for a
  // reply) — jump straight into it instead of making them find the WhatsApp
  // option again. Inlined (not routed through refreshThread) so the fetch
  // call sits directly in the effect body with a `cancelled` guard, same
  // shape as every other fetch-on-mount effect in this codebase (see e.g.
  // AttributeOptionsPanel.tsx).
  useEffect(() => {
    if (!open || !whatsappChatEnabled || threadLoaded) return;
    let cancelled = false;

    getWhatsAppChatThread()
      .then((thread) => {
        if (cancelled) return;
        setSessionId(thread.sessionId);
        setIsOpenNow(thread.isOpenNow);
        setMessages(thread.messages);
        if (thread.sessionId != null || thread.messages.length > 0) {
          setView("whatsapp");
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setThreadLoaded(true);
      });

    return () => {
      cancelled = true;
    };
  }, [open, whatsappChatEnabled, threadLoaded]);

  // Poll for the rep's reply only while the WhatsApp view is actually
  // visible — no point background-polling the FAQ view or a closed widget.
  useEffect(() => {
    if (!open || view !== "whatsapp") return;
    const intervalId = setInterval(refreshThread, POLL_INTERVAL_MS);
    return () => clearInterval(intervalId);
  }, [open, view]);

  async function handleSend() {
    if (!text.trim() || (sessionId == null && !phone.trim())) {
      toast.error(t("whatsappEmptyFieldsError"));
      return;
    }
    setSending(true);
    try {
      await sendWhatsAppChatMessage(phone.trim(), text.trim());
      setText("");
      await refreshThread();
    } catch (error) {
      const message = error instanceof ApiRequestError ? error.message : t("whatsappSendFailedError");
      toast.error(message);
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      {open && (
        <div
          className={`fixed right-4 z-50 flex w-[calc(100vw-2rem)] max-w-sm flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-xl transition-[bottom] duration-200 sm:right-6 ${
            cookieNoticeVisible ? "bottom-40 sm:bottom-44" : "bottom-22 sm:bottom-24"
          }`}
          style={{ maxHeight: "min(28rem, 70vh)" }}
        >
          <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3">
            <h2 className="text-sm font-bold tracking-tight">{t("title")}</h2>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label={t("closeLabel")}
              className="flex size-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              {closeIcon()}
            </button>
          </div>

          {view === "faq" && (
            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              <p className="text-sm text-muted-foreground">{t("greeting")}</p>

              {faqs.length > 0 && (
                <div className="mt-4 flex flex-col gap-2">
                  {faqs.map((faq) => {
                    const isOpen = openQuestionId === faq.id;
                    return (
                      <div key={faq.id} className="rounded-xl border border-border">
                        <button
                          type="button"
                          onClick={() => setOpenQuestionId(isOpen ? null : faq.id)}
                          className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left text-sm font-medium text-foreground"
                        >
                          {faq.question[locale]}
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth={2}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className={`size-4 shrink-0 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`}
                          >
                            <path d="m6 9 6 6 6-6" />
                          </svg>
                        </button>
                        {isOpen && (
                          <p className="border-t border-border px-3 py-2.5 text-sm text-muted-foreground">
                            {faq.answer[locale]}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {view === "whatsapp" && (
            <div className="flex min-h-0 flex-1 flex-col">
              <div className="min-h-0 flex-1 overflow-y-auto p-4">
                {!isOpenNow && (
                  <p className="mb-3 rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-400">
                    {t("whatsappOfflineBanner")}
                  </p>
                )}
                <WhatsAppThread messages={messages} />
              </div>
            </div>
          )}

          {view === "whatsapp" ? (
            <div className="flex shrink-0 flex-col gap-2 border-t border-border p-3">
              {sessionId == null && (
                <input
                  type="tel"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  placeholder={t("whatsappPhonePlaceholder")}
                  aria-label={t("whatsappPhoneLabel")}
                  className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                />
              )}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setView("faq")}
                  className="shrink-0 rounded-full px-3 py-2 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted"
                >
                  {t("whatsappBackLabel")}
                </button>
                <input
                  type="text"
                  value={text}
                  onChange={(event) => setText(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !sending) handleSend();
                  }}
                  placeholder={t("whatsappMessagePlaceholder")}
                  className="min-w-0 flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                />
                <button
                  type="button"
                  onClick={handleSend}
                  disabled={sending}
                  className="shrink-0 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover disabled:opacity-50"
                >
                  {sending ? t("whatsappSendingLabel") : t("whatsappSendLabel")}
                </button>
              </div>
            </div>
          ) : (
            whatsappChatEnabled && (
              <div className="shrink-0 border-t border-border p-3">
                <button
                  type="button"
                  onClick={() => setView("whatsapp")}
                  className="flex w-full items-center justify-center gap-2 rounded-full bg-[#25D366] px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-4">
                    <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.28-1.38c1.44.79 3.06 1.2 4.71 1.2h.01c5.46 0 9.91-4.45 9.91-9.91S17.5 2 12.04 2Zm0 18.15h-.01c-1.48 0-2.93-.4-4.19-1.15l-.3-.18-3.13.82.84-3.05-.2-.31a8.19 8.19 0 0 1-1.26-4.37c0-4.54 3.7-8.24 8.25-8.24 2.2 0 4.27.86 5.83 2.42a8.18 8.18 0 0 1 2.41 5.83c0 4.55-3.7 8.24-8.24 8.24Zm4.52-6.17c-.25-.12-1.47-.72-1.7-.81-.23-.08-.39-.12-.56.13-.17.25-.64.81-.78.97-.14.17-.29.19-.54.06-.25-.12-1.05-.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.02-.38.11-.51.11-.11.25-.29.37-.43.12-.14.16-.25.25-.41.08-.17.04-.31-.02-.44-.06-.12-.56-1.35-.77-1.85-.2-.48-.41-.42-.56-.42-.14-.01-.31-.01-.48-.01-.17 0-.44.06-.67.31-.23.25-.87.85-.87 2.08 0 1.23.89 2.41 1.02 2.58.12.17 1.75 2.67 4.24 3.74.59.26 1.06.41 1.42.52.6.19 1.14.16 1.57.1.48-.07 1.47-.6 1.68-1.18.21-.58.21-1.07.14-1.18-.06-.1-.23-.16-.48-.28Z" />
                  </svg>
                  {t("whatsappStartCta")}
                </button>
              </div>
            )
          )}
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-label={open ? t("closeLabel") : t("openLabel")}
        className={`fixed right-4 z-50 flex size-11 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-[bottom] duration-200 hover:bg-primary-hover sm:right-6 ${
          cookieNoticeVisible ? "bottom-24 sm:bottom-28" : "bottom-6"
        }`}
      >
        {open ? closeIcon() : chatIcon()}
      </button>
    </>
  );
}
