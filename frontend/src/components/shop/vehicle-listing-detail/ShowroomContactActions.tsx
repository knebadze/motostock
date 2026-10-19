"use client";

import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Link } from "@/i18n/navigation";
import { Modal } from "@/components/shared/Modal";
import { Select } from "@/components/shared/Select";
import { openWhatsAppChat } from "@/components/shared/ChatWidget";
import { resolveApiErrorMessage } from "@/lib/api-errors";
import { buildWhatsAppUrl, createCallbackRequest } from "@/lib/api/callback-requests";

const inputClassName =
  "rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary";

const PREFERRED_TIME_KEYS = ["any", "morning", "afternoon", "evening"] as const;

// Next to "visit the showroom" on a listing that can't be bought online:
// ask the shop to call back (lands in the admin requests inbox + email), or
// write on WhatsApp with a message already naming this bike and its link —
// through the site's own chat (it relays to the shop's WhatsApp, the
// customer never leaves the page) when that's enabled, otherwise a wa.me
// link to the shop's number.
export function ShowroomContactActions({
  listingId,
  itemTitle,
  pageUrl,
  whatsappPhone,
  whatsappChatEnabled,
}: {
  listingId: number;
  itemTitle: string;
  pageUrl: string;
  // Shop's WhatsApp number (falls back to its main phone); null hides the
  // WhatsApp button.
  whatsappPhone: string | null;
  // CompanyInfo.whatsappChatEnabled — the site chat widget's WhatsApp relay.
  whatsappChatEnabled: boolean;
}) {
  const t = useTranslations("VehicleListingDetail");
  const tErrors = useTranslations("ApiErrors");
  const tSelect = useTranslations("Common.select");
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [preferredTime, setPreferredTime] = useState<(typeof PREFERRED_TIME_KEYS)[number]>("any");
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const whatsappText = t("whatsappMessage", { item: itemTitle, url: pageUrl });
  const whatsappUrl = !whatsappChatEnabled && whatsappPhone ? buildWhatsAppUrl(whatsappPhone, whatsappText) : null;
  const whatsappButtonClassName =
    "inline-flex items-center gap-2 rounded-full bg-[#25D366] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#1ebe5b]";
  const whatsappIcon = (
    <svg viewBox="0 0 24 24" fill="currentColor" className="size-4 shrink-0" aria-hidden>
      <path d="M17.5 14.4c-.3-.1-1.8-.9-2-1s-.5-.1-.7.1-.8 1-.9 1.2-.3.2-.6.1a8.2 8.2 0 0 1-2.4-1.5 9 9 0 0 1-1.7-2.1c-.2-.3 0-.5.1-.6l.4-.5.3-.5v-.5l-.9-2.2c-.2-.6-.5-.5-.7-.5h-.6a1.1 1.1 0 0 0-.8.4 3.4 3.4 0 0 0-1 2.5 5.9 5.9 0 0 0 1.2 3.1 13.5 13.5 0 0 0 5.2 4.6c.7.3 1.3.5 1.7.6a4.2 4.2 0 0 0 1.9.1 3.1 3.1 0 0 0 2-1.4 2.5 2.5 0 0 0 .2-1.4c-.1-.1-.3-.2-.6-.3ZM12 21.8a9.8 9.8 0 0 1-5-1.4l-.4-.2-3.7 1 1-3.6-.2-.4a9.8 9.8 0 1 1 8.3 4.6ZM20.4 3.6A11.8 11.8 0 0 0 1.9 17.8L.2 24l6.3-1.7a11.8 11.8 0 0 0 5.6 1.4A11.8 11.8 0 0 0 20.4 3.6Z" />
    </svg>
  );

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (name.trim().length < 2 || phone.trim().length < 9) {
      toast.error(t("callbackValidation"));
      return;
    }
    setSending(true);
    try {
      await createCallbackRequest({
        vehicleListingId: listingId,
        name: name.trim(),
        phone: phone.trim(),
        preferredTime: preferredTime === "any" ? undefined : t(`callbackTime.${preferredTime}`),
        note: note.trim() || undefined,
      });
      setSent(true);
    } catch (error) {
      toast.error(resolveApiErrorMessage(error, tErrors, t("callbackError")));
    } finally {
      setSending(false);
    }
  }

  function close() {
    if (sending) return;
    setOpen(false);
    if (sent) {
      setSent(false);
      setNote("");
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="size-4 shrink-0"
          aria-hidden
        >
          <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2Z" />
        </svg>
        {t("callbackButton")}
      </button>
      {whatsappChatEnabled ? (
        <button type="button" onClick={() => openWhatsAppChat(whatsappText)} className={whatsappButtonClassName}>
          {whatsappIcon}
          {t("whatsappButton")}
        </button>
      ) : (
        whatsappUrl && (
          <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className={whatsappButtonClassName}>
            {whatsappIcon}
            {t("whatsappButton")}
          </a>
        )
      )}

      <Modal open={open} onClose={close} title={t("callbackTitle")} closeLabel={t("callbackClose")}>
        {sent ? (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-foreground">{t("callbackSent")}</p>
            <button
              type="button"
              onClick={close}
              className="self-end rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover"
            >
              {t("callbackClose")}
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">{t("callbackIntro", { item: itemTitle })}</p>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="callback-name" className="text-sm font-medium">
                {t("callbackName")}
              </label>
              <input
                id="callback-name"
                autoComplete="name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={100}
                className={inputClassName}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="callback-phone" className="text-sm font-medium">
                {t("callbackPhone")}
              </label>
              <input
                id="callback-phone"
                type="tel"
                autoComplete="tel"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                maxLength={20}
                placeholder="5XX XX XX XX"
                className={inputClassName}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-medium">{t("callbackPreferredTime")}</span>
              <Select
                ariaLabel={t("callbackPreferredTime")}
                options={PREFERRED_TIME_KEYS.map((key) => ({ value: key, label: t(`callbackTime.${key}`) }))}
                value={preferredTime}
                onChange={(value) => setPreferredTime(value as (typeof PREFERRED_TIME_KEYS)[number])}
                emptyLabel={tSelect("empty")}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="callback-note" className="text-sm font-medium">
                {t("callbackNote")}
              </label>
              <textarea
                id="callback-note"
                value={note}
                onChange={(event) => setNote(event.target.value)}
                rows={3}
                maxLength={1000}
                className={inputClassName}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {t.rich("callbackPrivacy", {
                privacy: (chunks) => (
                  <Link href="/privacy" target="_blank" className="font-medium text-primary-text hover:underline">
                    {chunks}
                  </Link>
                ),
              })}
            </p>
            <button
              type="submit"
              disabled={sending}
              className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover disabled:opacity-50"
            >
              {sending ? t("callbackSending") : t("callbackSubmit")}
            </button>
          </form>
        )}
      </Modal>
    </>
  );
}
