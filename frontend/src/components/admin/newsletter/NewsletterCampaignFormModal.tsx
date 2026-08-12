"use client";

import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Modal } from "@/components/shared/Modal";
import { FieldError } from "@/components/shared/FieldError";
import { FormActions } from "@/components/shared/FormActions";
import { RichTextEditor } from "@/components/shared/RichTextEditor";
import { sanitizeRichText } from "@/lib/sanitize-html";
import {
  createNewsletterCampaign,
  updateNewsletterCampaign,
  type NewsletterCampaign,
} from "@/lib/api/newsletter-campaigns";
import { ApiRequestError } from "@/lib/api/client";
import { newsletterCampaignFormSchema } from "@/lib/validation/newsletter-campaigns";
import { getFieldErrors, type FieldErrors } from "@/lib/validation/common";

export function NewsletterCampaignFormModal({
  open,
  onClose,
  onSaved,
  campaign,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  campaign: NewsletterCampaign | null;
}) {
  const isEditing = campaign !== null;
  // A non-DRAFT campaign's content is a historical record (see the Prisma
  // model's comment) — the backend already rejects editing it, this just
  // presents that as a read-only view instead of a save that will 409.
  const readOnly = campaign != null && campaign.status !== "DRAFT";

  const [subject, setSubject] = useState(campaign?.subject ?? "");
  const [body, setBody] = useState(campaign?.body ?? "");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    const result = newsletterCampaignFormSchema.safeParse({ subject, body });
    if (!result.success) {
      setErrors(getFieldErrors(result.error));
      toast.error("გთხოვთ შეასწოროთ ველები");
      return;
    }
    setErrors({});

    setLoading(true);
    try {
      const input = { subject: subject.trim(), body };
      if (isEditing) {
        await updateNewsletterCampaign(campaign.id, input);
      } else {
        await createNewsletterCampaign(input);
      }

      toast.success(isEditing ? "კამპანია განახლდა" : "კამპანია შეიქმნა");
      onSaved();
      onClose();
    } catch (error) {
      const message = error instanceof ApiRequestError ? error.message : "შენახვა ვერ მოხერხდა";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={readOnly ? "კამპანია (გაგზავნილია)" : isEditing ? "კამპანიის რედაქტირება" : "ახალი კამპანია"}
      size="xl"
    >
      {readOnly ? (
        <div className="flex flex-col gap-4">
          <div>
            <p className="text-sm font-medium text-muted-foreground">სათაური</p>
            <p className="mt-1 font-semibold">{campaign.subject}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">შინაარსი</p>
            <div
              className="mt-2 rounded-lg border border-border bg-muted/30 p-4 text-sm"
              dangerouslySetInnerHTML={{ __html: sanitizeRichText(campaign.body) }}
            />
          </div>
          <div className="mt-2 flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-border px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:border-primary hover:text-primary"
            >
              დახურვა
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="campaign-subject" className="text-sm font-medium">
              სათაური *
            </label>
            <input
              id="campaign-subject"
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              placeholder="მაგ. ახალი კოლექცია უკვე მაღაზიაში"
            />
            <FieldError message={errors.subject} />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">შინაარსი *</label>
            <RichTextEditor value={body} onChange={setBody} />
            <FieldError message={errors.body} />
          </div>

          <FormActions onCancel={onClose} loading={loading} />
        </form>
      )}
    </Modal>
  );
}
