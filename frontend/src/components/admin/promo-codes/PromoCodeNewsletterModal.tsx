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
import { ApiRequestError } from "@/lib/api/client";
import { toTbilisiDateOnly } from "@/lib/format";
import { VEHICLE_ROOT_CATEGORY_SLUG } from "@/lib/categories-tree";
import type { PromoCode } from "@/lib/api/promo-codes";
import { scopeSummary } from "./PromoCodesManager";

function buildDefaultSubject(promoCode: PromoCode): string {
  return `-${promoCode.discountPercent}% ფასდაკლება კოდით ${promoCode.code}`;
}

// A promo code creates no discount rows to filter a shop page by (see
// buildDiscountLink's identical reasoning in HeroSlider.tsx) — this links
// straight to the code's own category (plain, no onSale) so customers land
// exactly where the code applies, then have to type it in themselves.
// window.location.origin is safe here because admin and storefront are the
// same Next.js app/origin, never a separate admin subdomain — needed
// because an email is opened outside this app's own origin entirely.
function buildAbsoluteShopUrl(promoCode: PromoCode): string {
  const relative =
    promoCode.domain === "VEHICLE"
      ? `/${promoCode.category?.slug ?? VEHICLE_ROOT_CATEGORY_SLUG}`
      : promoCode.category
        ? `/shop?categoryId=${promoCode.category.id}`
        : "/shop";
  return typeof window !== "undefined" ? `${window.location.origin}${relative}` : relative;
}

// Campaign emails are always Georgian (see newsletter-campaign.prisma's own
// comment), matching this admin panel's own KA-only convention — no locale
// branching needed here, unlike the hero-slider integration.
function buildDefaultBody(promoCode: PromoCode): string {
  const shopUrl = buildAbsoluteShopUrl(promoCode);
  return [
    `<h2>-${promoCode.discountPercent}% ფასდაკლება კოდით ${promoCode.code}</h2>`,
    `<p>ვრცელდება: ${scopeSummary(promoCode)}</p>`,
    `<p>მოქმედების ვადა: ${toTbilisiDateOnly(promoCode.startDate)}-დან ${toTbilisiDateOnly(promoCode.endDate)}-მდე</p>`,
    `<p><a href="${shopUrl}">გადადით მაღაზიაში</a></p>`,
  ].join("\n");
}

// Creates a NewsletterCampaign pre-filled from the promo code and sends it
// immediately (with a confirm step — sending is irreversible). Same
// architecture as bulk-discounts' EventNewsletterModal.tsx — see that file
// for the fuller rationale (why no "save as draft only" path, why the
// created-before-failure distinction on error).
export function PromoCodeNewsletterModal({
  promoCode,
  onClose,
}: {
  promoCode: PromoCode | null;
  onClose: () => void;
}) {
  const [subject, setSubject] = useState(promoCode ? buildDefaultSubject(promoCode) : "");
  const [body, setBody] = useState(promoCode ? buildDefaultBody(promoCode) : "");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [confirmOpen, setConfirmOpen] = useState(false);
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
    <Modal open={promoCode !== null} onClose={onClose} title="მეილის გაგზავნა გამომწერებთან" size="xl">
      {promoCode && (
        <>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">
              შაბლონი წინასწარ შევსებულია კოდის მონაცემებით (კოდი, არეალი, პროცენტი, ვადები) —
              გაგზავნამდე თავისუფლად შეასწორეთ. გაიგზავნება ყველა დადასტურებულ გამომწერზე.
            </p>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="promo-newsletter-subject" className="text-sm font-medium">
                სათაური *
              </label>
              <input
                id="promo-newsletter-subject"
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
