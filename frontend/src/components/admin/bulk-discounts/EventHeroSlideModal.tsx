"use client";

import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Modal } from "@/components/shared/Modal";
import { FormActions } from "@/components/shared/FormActions";
import { Loader } from "@/components/shared/Loader";
import { useFileUploadPreview } from "@/components/shared/useFileUploadPreview";
import {
  getBulkDiscountEventHeroSlide,
  setBulkDiscountEventHeroSlide,
  uploadBulkDiscountEventHeroSlideImage,
  type BulkDiscountEvent,
} from "@/lib/api/bulk-discount-events";
import { ApiRequestError, resolveMediaUrl } from "@/lib/api/client";

const DEFAULT_BUTTON_LABEL = { ka: "იხილეთ ფასდაკლება", en: "View discount", ru: "Смотреть скидку" };

// Creates (or edits, if event.heroSlideId is already set) this event's
// homepage hero-slider DISCOUNT slide. Title/subtitle/image default from the
// event's own name/description/image (or the existing slide's own values,
// when editing) — all editable here, never written back to the event
// itself. The slide's click-through link is always computed from the event
// id + targetType (see HeroSlider.tsx's buildDiscountLink) — never a field
// on this form.
export function EventHeroSlideModal({
  event,
  onClose,
  onSaved,
}: {
  event: BulkDiscountEvent | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEditing = event?.heroSlideId != null;
  const [loadingExisting, setLoadingExisting] = useState(isEditing);
  const [titleKa, setTitleKa] = useState(event?.nameKa ?? "");
  const [titleEn, setTitleEn] = useState(event?.nameEn ?? "");
  const [titleRu, setTitleRu] = useState(event?.nameRu ?? "");
  const [subtitleKa, setSubtitleKa] = useState(event?.descriptionKa ?? "");
  const [subtitleEn, setSubtitleEn] = useState(event?.descriptionEn ?? "");
  const [subtitleRu, setSubtitleRu] = useState(event?.descriptionRu ?? "");
  const [buttonLabelKa, setButtonLabelKa] = useState(DEFAULT_BUTTON_LABEL.ka);
  const [buttonLabelEn, setButtonLabelEn] = useState(DEFAULT_BUTTON_LABEL.en);
  const [buttonLabelRu, setButtonLabelRu] = useState(DEFAULT_BUTTON_LABEL.ru);
  const {
    file: imageFile,
    previewUrl,
    onChange: handleImageChange,
    reset: resetImage,
  } = useFileUploadPreview(resolveMediaUrl(event?.imageUrl ?? null));
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!event || event.heroSlideId == null) return;
    let cancelled = false;
    getBulkDiscountEventHeroSlide(event.id)
      .then((slide) => {
        if (cancelled) return;
        setTitleKa(slide.title.ka);
        setTitleEn(slide.title.en);
        setTitleRu(slide.title.ru);
        setSubtitleKa(slide.subtitle?.ka ?? "");
        setSubtitleEn(slide.subtitle?.en ?? "");
        setSubtitleRu(slide.subtitle?.ru ?? "");
        setButtonLabelKa(slide.buttonLabel?.ka ?? DEFAULT_BUTTON_LABEL.ka);
        setButtonLabelEn(slide.buttonLabel?.en ?? DEFAULT_BUTTON_LABEL.en);
        setButtonLabelRu(slide.buttonLabel?.ru ?? DEFAULT_BUTTON_LABEL.ru);
        resetImage(resolveMediaUrl(slide.imageUrl));
      })
      .catch(() => {
        if (!cancelled) toast.error("სლაიდის ჩატვირთვა ვერ მოხერხდა");
      })
      .finally(() => {
        if (!cancelled) setLoadingExisting(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event?.id]);

  async function handleSubmit(formEvent: FormEvent) {
    formEvent.preventDefault();
    if (!event) return;
    if (!titleKa.trim() || !titleEn.trim() || !titleRu.trim()) {
      toast.error("სათაური სამივე ენაზეა საჭირო");
      return;
    }
    if (!buttonLabelKa.trim() || !buttonLabelEn.trim() || !buttonLabelRu.trim()) {
      toast.error("ღილაკის ტექსტი სამივე ენაზეა საჭირო");
      return;
    }
    const hasSubtitle = subtitleKa.trim() || subtitleEn.trim() || subtitleRu.trim();

    setLoading(true);
    try {
      const saved = await setBulkDiscountEventHeroSlide(event.id, {
        title: { ka: titleKa.trim(), en: titleEn.trim(), ru: titleRu.trim() },
        subtitle: hasSubtitle
          ? { ka: subtitleKa.trim(), en: subtitleEn.trim(), ru: subtitleRu.trim() }
          : null,
        buttonLabel: {
          ka: buttonLabelKa.trim(),
          en: buttonLabelEn.trim(),
          ru: buttonLabelRu.trim(),
        },
      });

      if (imageFile) {
        try {
          await uploadBulkDiscountEventHeroSlideImage(saved.id, imageFile);
        } catch {
          toast.error("სლაიდი შენახულია, მაგრამ სურათის ატვირთვა ვერ მოხერხდა");
          onSaved();
          onClose();
          return;
        }
      }

      toast.success(isEditing ? "სლაიდი განახლდა" : "სლაიდი შეიქმნა");
      onSaved();
      onClose();
    } catch (error) {
      toast.error(error instanceof ApiRequestError ? error.message : "შენახვა ვერ მოხერხდა");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      open={event !== null}
      onClose={onClose}
      title={isEditing ? "სლაიდის რედაქტირება" : "სლაიდის შექმნა"}
      size="2xl"
    >
      {event &&
        (loadingExisting ? (
          <div className="flex items-center justify-center py-10">
            <Loader size="md" label="იტვირთება" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">
              გამოჩნდება მთავარი გვერდის სლაიდერში — ღილაკი გადაამისამართებს ზუსტად ამ ივენთის
              ფარგლებში არსებულ პროდუქტებზე/განცხადებებზე, არასდროს ხელით მითითებულ ბმულზე.
            </p>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">სათაური (ქართულად) *</label>
                <input
                  value={titleKa}
                  onChange={(inputEvent) => setTitleKa(inputEvent.target.value)}
                  className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">სათაური (ინგლისურად) *</label>
                <input
                  value={titleEn}
                  onChange={(inputEvent) => setTitleEn(inputEvent.target.value)}
                  className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">სათაური (რუსულად) *</label>
                <input
                  value={titleRu}
                  onChange={(inputEvent) => setTitleRu(inputEvent.target.value)}
                  className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                />
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">ქვესათაური (ქართულად)</label>
                <textarea
                  value={subtitleKa}
                  onChange={(inputEvent) => setSubtitleKa(inputEvent.target.value)}
                  rows={2}
                  className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">ქვესათაური (ინგლისურად)</label>
                <textarea
                  value={subtitleEn}
                  onChange={(inputEvent) => setSubtitleEn(inputEvent.target.value)}
                  rows={2}
                  className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">ქვესათაური (რუსულად)</label>
                <textarea
                  value={subtitleRu}
                  onChange={(inputEvent) => setSubtitleRu(inputEvent.target.value)}
                  rows={2}
                  className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">ღილაკის ტექსტი (ქართულად) *</label>
                <input
                  value={buttonLabelKa}
                  onChange={(inputEvent) => setButtonLabelKa(inputEvent.target.value)}
                  className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">ღილაკის ტექსტი (ინგლისურად) *</label>
                <input
                  value={buttonLabelEn}
                  onChange={(inputEvent) => setButtonLabelEn(inputEvent.target.value)}
                  className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">ღილაკის ტექსტი (რუსულად) *</label>
                <input
                  value={buttonLabelRu}
                  onChange={(inputEvent) => setButtonLabelRu(inputEvent.target.value)}
                  className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">სურათი</label>
              <p className="text-xs text-muted-foreground">
                ნაგულისხმევად ივენთის სურათია — შეგიძლიათ სხვა აირჩიოთ. რეკომენდებული ზომა:
                1920×800px (თანაფარდობა ~21:9), მაქს. 5MB, ფორმატი: jpg/png/webp.
              </p>
              {previewUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={previewUrl}
                  alt=""
                  className="h-32 w-full rounded-lg border border-border object-cover"
                />
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
        ))}
    </Modal>
  );
}
