"use client";

import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Modal } from "@/components/shared/Modal";
import { FormActions } from "@/components/shared/FormActions";
import { useFileUploadPreview } from "@/components/shared/useFileUploadPreview";
import {
  updateBulkDiscountEvent,
  uploadBulkDiscountEventImage,
  type BulkDiscountEvent,
} from "@/lib/api/bulk-discount-events";
import { ApiRequestError, resolveMediaUrl } from "@/lib/api/client";

// Metadata-only edit — name/description/image. discountPercent/dates/
// itemCount/targetType describe the actual discount rows this event grouped
// and aren't editable here (see RepeatBulkDiscountEventModal for re-running
// the batch at new dates instead). Mirrors HeroSlideFormModal's two-step
// "save fields, then separately upload the image against the returned id"
// sequencing.
export function EditBulkDiscountEventModal({
  event,
  onClose,
  onSaved,
}: {
  event: BulkDiscountEvent | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [nameKa, setNameKa] = useState(event?.nameKa ?? "");
  const [nameEn, setNameEn] = useState(event?.nameEn ?? "");
  const [nameRu, setNameRu] = useState(event?.nameRu ?? "");
  const [descriptionKa, setDescriptionKa] = useState(event?.descriptionKa ?? "");
  const [descriptionEn, setDescriptionEn] = useState(event?.descriptionEn ?? "");
  const [descriptionRu, setDescriptionRu] = useState(event?.descriptionRu ?? "");
  const { file: imageFile, previewUrl, onChange: handleImageChange } = useFileUploadPreview(
    resolveMediaUrl(event?.imageUrl ?? null),
  );
  const [loading, setLoading] = useState(false);

  async function handleSubmit(formEvent: FormEvent) {
    formEvent.preventDefault();
    if (!event) return;
    if (!nameKa.trim() || !nameEn.trim() || !nameRu.trim()) {
      toast.error("სახელი სამივე ენაზეა საჭირო");
      return;
    }

    setLoading(true);
    try {
      await updateBulkDiscountEvent(event.id, {
        nameKa: nameKa.trim(),
        nameEn: nameEn.trim(),
        nameRu: nameRu.trim(),
        descriptionKa: descriptionKa.trim() || undefined,
        descriptionEn: descriptionEn.trim() || undefined,
        descriptionRu: descriptionRu.trim() || undefined,
      });

      if (imageFile) {
        try {
          await uploadBulkDiscountEventImage(event.id, imageFile);
        } catch {
          toast.error("ივენთი განახლდა, მაგრამ სურათის ატვირთვა ვერ მოხერხდა");
          onSaved();
          onClose();
          return;
        }
      }

      toast.success("ივენთი განახლდა");
      onSaved();
      onClose();
    } catch (error) {
      toast.error(error instanceof ApiRequestError ? error.message : "განახლება ვერ მოხერხდა");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal open={event !== null} onClose={onClose} title="ივენთის რედაქტირება" size="2xl">
      {event && (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">სახელი (ქართულად) *</label>
              <input
                value={nameKa}
                onChange={(inputEvent) => setNameKa(inputEvent.target.value)}
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">სახელი (ინგლისურად) *</label>
              <input
                value={nameEn}
                onChange={(inputEvent) => setNameEn(inputEvent.target.value)}
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">სახელი (რუსულად) *</label>
              <input
                value={nameRu}
                onChange={(inputEvent) => setNameRu(inputEvent.target.value)}
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              />
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">აღწერა (ქართულად)</label>
              <textarea
                value={descriptionKa}
                onChange={(inputEvent) => setDescriptionKa(inputEvent.target.value)}
                rows={3}
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">აღწერა (ინგლისურად)</label>
              <textarea
                value={descriptionEn}
                onChange={(inputEvent) => setDescriptionEn(inputEvent.target.value)}
                rows={3}
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">აღწერა (რუსულად)</label>
              <textarea
                value={descriptionRu}
                onChange={(inputEvent) => setDescriptionRu(inputEvent.target.value)}
                rows={3}
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">სურათი</label>
            <p className="text-xs text-muted-foreground">
              რეკომენდებული ზომა: 1920×800px (თანაფარდობა ~21:9), მაქს. 5MB, ფორმატი: jpg/png/webp.
            </p>
            {previewUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={previewUrl} alt="" className="h-32 w-full rounded-lg border border-border object-cover" />
            )}
            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="text-sm text-muted-foreground file:mr-3 file:rounded-full file:border-0 file:bg-muted file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-foreground hover:file:bg-border"
            />
          </div>

          <FormActions onCancel={onClose} loading={loading} submitLabel="შენახვა" />
        </form>
      )}
    </Modal>
  );
}
