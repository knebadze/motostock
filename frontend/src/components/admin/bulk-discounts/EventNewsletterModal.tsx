"use client";

import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Modal } from "@/components/shared/Modal";
import { FieldError } from "@/components/shared/FieldError";
import { RichTextEditor } from "@/components/shared/RichTextEditor";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { createNewsletterCampaign, sendNewsletterCampaign } from "@/lib/api/newsletter-campaigns";
import { newsletterCampaignFormSchema } from "@/lib/validation/newsletter-campaigns";
import { getFieldErrors, type FieldErrors } from "@/lib/validation/common";
import { ApiRequestError, resolveMediaUrl } from "@/lib/api/client";
import { formatDate } from "@/lib/format";
import { VEHICLE_ROOT_CATEGORY_SLUG } from "@/lib/categories-tree";
import type { BulkDiscountEvent } from "@/lib/api/bulk-discount-events";

function buildDefaultSubject(event: BulkDiscountEvent): string {
  return `${event.nameKa} — -${event.discountPercent}%`;
}

// Same event-scoped shop link DiscountEventsPanel.tsx's own "ნახვა
// მაღაზიაში" button uses, just as a full absolute URL — an email is opened
// outside this app's own origin, so a relative /ka/... path wouldn't
// resolve. window.location.origin is safe here because admin and storefront
// are the same Next.js app/origin, never a separate admin subdomain.
function buildAbsoluteShopUrl(event: BulkDiscountEvent): string {
  const path = event.targetType === "VEHICLE_LISTING" ? `/${VEHICLE_ROOT_CATEGORY_SLUG}` : "/shop";
  const relative = `/ka${path}?eventId=${event.id}`;
  return typeof window !== "undefined" ? `${window.location.origin}${relative}` : relative;
}

// Campaign emails are always Georgian (see newsletter-campaign.prisma's own
// comment — no per-user language preference exists anywhere yet), so this
// only ever reads the event's *Ka fields, never title/subtitle-per-locale
// like the hero-slider integration does.
function buildDefaultBody(event: BulkDiscountEvent): string {
  const imageUrl = resolveMediaUrl(event.imageUrl);
  const shopUrl = buildAbsoluteShopUrl(event);
  return [
    imageUrl ? `<img src="${imageUrl}" alt="" />` : "",
    `<h2>${event.nameKa}</h2>`,
    event.descriptionKa ? `<p>${event.descriptionKa}</p>` : "",
    `<p><strong>-${event.discountPercent}%</strong> — ${formatDate(event.startDate)}-დან ${formatDate(event.endDate)}-მდე</p>`,
    `<p><a href="${shopUrl}">იხილეთ ფასდაკლება</a></p>`,
  ]
    .filter(Boolean)
    .join("\n");
}

// Creates a NewsletterCampaign pre-filled from the event and sends it
// immediately (with a confirm step — sending is irreversible, same
// ConfirmDialog wording NewsletterManager.tsx's own campaign-send action
// uses). Doesn't touch the event or offer a "save as draft only" path —
// for that, the general "ახალი კამპანია" flow in the Newsletter admin page
// already exists; this button's whole purpose is the one-step "turn this
// event into a sent email" shortcut.
export function EventNewsletterModal({
  event,
  onClose,
}: {
  event: BulkDiscountEvent | null;
  onClose: () => void;
}) {
  const [subject, setSubject] = useState(event ? buildDefaultSubject(event) : "");
  const [body, setBody] = useState(event ? buildDefaultBody(event) : "");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [confirmOpen, setConfirmOpen] = useState(false);
  // Distinguishes "the campaign itself failed to save" from "it saved fine
  // but sending failed" (e.g. mailer not configured) — resolveErrorMessage
  // below uses this to tell the admin their edits weren't lost either way,
  // without a second, redundant toast on top of ConfirmDialog's own.
  const [createdBeforeFailure, setCreatedBeforeFailure] = useState(false);

  function handleSubmit(formEvent: FormEvent) {
    formEvent.preventDefault();
    const result = newsletterCampaignFormSchema.safeParse({ subject, body });
    if (!result.success) {
      setErrors(getFieldErrors(result.error));
      toast.error("გთხოვთ შეასწოროთ ველები");
      return;
    }
    setErrors({});
    setConfirmOpen(true);
  }

  return (
    <Modal open={event !== null} onClose={onClose} title="მეილის გაგზავნა გამომწერებთან" size="xl">
      {event && (
        <>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">
              შაბლონი წინასწარ შევსებულია ივენთის მონაცემებით (სახელი, აღწერა, სურათი, პროცენტი,
              ვადები) — გაგზავნამდე თავისუფლად შეასწორეთ. გაიგზავნება ყველა დადასტურებულ
              გამომწერზე.
            </p>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="event-newsletter-subject" className="text-sm font-medium">
                სათაური *
              </label>
              <input
                id="event-newsletter-subject"
                value={subject}
                onChange={(inputEvent) => setSubject(inputEvent.target.value)}
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              />
              <FieldError message={errors.subject} />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">შინაარსი *</label>
              <RichTextEditor value={body} onChange={setBody} />
              <FieldError message={errors.body} />
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="rounded-full border border-border px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:border-primary hover:text-primary"
              >
                გაუქმება
              </button>
              <button
                type="submit"
                className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover"
              >
                გაგზავნა
              </button>
            </div>
          </form>

          <ConfirmDialog
            open={confirmOpen}
            onClose={() => setConfirmOpen(false)}
            title="მეილის გაგზავნა"
            confirmLabel="გაგზავნა"
            message={
              <>
                კამპანია <span className="font-semibold text-foreground">{subject}</span> გაეგზავნება
                ყველა დადასტურებულ გამომწერს. გაგზავნის შემდეგ ვეღარ შეასწორებთ.
              </>
            }
            successMessage="მეილი გაიგზავნა"
            resolveErrorMessage={(error) => {
              const base = error instanceof ApiRequestError ? error.message : "გაგზავნა ვერ მოხერხდა";
              // Only true once createNewsletterCampaign below has actually
              // succeeded — tells the admin their edits weren't lost even
              // though sending itself failed (e.g. mailer not configured);
              // they can send the resulting draft later from the Newsletter
              // admin page instead of retyping everything.
              return createdBeforeFailure ? `კამპანია შეიქმნა დრაფტად, მაგრამ ${base}` : base;
            }}
            onConfirm={async () => {
              const campaign = await createNewsletterCampaign({ subject: subject.trim(), body });
              setCreatedBeforeFailure(true);
              await sendNewsletterCampaign(campaign.id);
              onClose();
            }}
          />
        </>
      )}
    </Modal>
  );
}
