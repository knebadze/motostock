"use client";

import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Modal } from "@/components/shared/Modal";
import { FormActions } from "@/components/shared/FormActions";
import { Loader } from "@/components/shared/Loader";
import { useFileUploadPreview } from "@/components/shared/useFileUploadPreview";
import {
  getPromoCodeHeroSlide,
  setPromoCodeHeroSlide,
  uploadPromoCodeHeroSlideImage,
  type PromoCode,
} from "@/lib/api/promo-codes";
import { ApiRequestError, resolveMediaUrl } from "@/lib/api/client";

const DEFAULT_BUTTON_LABEL = { ka: "იხილეთ ფასდაკლება", en: "View discount", ru: "Смотреть скидку" };

// Creates (or edits, if promoCode.heroSlideId is already set) this code's
// homepage hero-slider DISCOUNT slide. Unlike EventHeroSlideModal, a
// PromoCode has no name/description/image of its own to default from — only
// title defaults (to a sentence mentioning the code and percent), subtitle
// starts blank, and the image must always be uploaded here. The slide's
// click-through link is always computed from the code's id/domain/scope
// (see HeroSlider.tsx's buildDiscountLink) — never a field on this form.
export function PromoCodeHeroSlideModal({
  promoCode,
  onClose,
  onSaved,
}: {
  promoCode: PromoCode | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEditing = promoCode?.heroSlideId != null;
  const [loadingExisting, setLoadingExisting] = useState(isEditing);
  const [titleKa, setTitleKa] = useState(
    promoCode ? `-${promoCode.discountPercent}% ფასდაკლება კოდით ${promoCode.code}` : "",
  );
  const [titleEn, setTitleEn] = useState(
    promoCode ? `-${promoCode.discountPercent}% off with code ${promoCode.code}` : "",
  );
  const [titleRu, setTitleRu] = useState(
    promoCode ? `-${promoCode.discountPercent}% скидка по коду ${promoCode.code}` : "",
  );
  const [subtitleKa, setSubtitleKa] = useState("");
  const [subtitleEn, setSubtitleEn] = useState("");
  const [subtitleRu, setSubtitleRu] = useState("");
  const [buttonLabelKa, setButtonLabelKa] = useState(DEFAULT_BUTTON_LABEL.ka);
  const [buttonLabelEn, setButtonLabelEn] = useState(DEFAULT_BUTTON_LABEL.en);
  const [buttonLabelRu, setButtonLabelRu] = useState(DEFAULT_BUTTON_LABEL.ru);
  const {
    file: imageFile,
    previewUrl,
    onChange: handleImageChange,
    reset: resetImage,
  } = useFileUploadPreview(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!promoCode || promoCode.heroSlideId == null) return;
    let cancelled = false;
    getPromoCodeHeroSlide(promoCode.id)
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
  }, [promoCode?.id]);

  async function handleSubmit(formEvent: FormEvent) {
    formEvent.preventDefault();
    if (!promoCode) return;
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
      const saved = await setPromoCodeHeroSlide(promoCode.id, {
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
          await uploadPromoCodeHeroSlideImage(saved.id, imageFile);
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
      open={promoCode !== null}
      onClose={onClose}
      title={isEditing ? "სლაიდის რედაქტირება" : "სლაიდის შექმნა"}
      size="2xl"
    >
      {promoCode &&
        (loadingExisting ? (
          <div className="flex items-center justify-center py-10">
            <Loader size="md" label="იტვირთება" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">
              გამოჩნდება მთავარი გვერდის სლაიდერში, კოდის (
              <span className="font-mono font-semibold text-foreground">{promoCode.code}</span>)
              აღნიშვნით — ღილაკი გადაამისამართებს მაღაზიაში, სადაც მომხმარებელს კოდის შეყვანა
              მოუწევს.
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
                რეკომენდებული ზომა: 1920×800px (თანაფარდობა ~21:9), მაქს. 5MB, ფორმატი:
                jpg/png/webp.
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
