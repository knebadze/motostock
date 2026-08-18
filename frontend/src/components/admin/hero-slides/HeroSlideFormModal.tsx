"use client";

import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Modal } from "@/components/shared/Modal";
import { Select } from "@/components/shared/Select";
import { FieldError } from "@/components/shared/FieldError";
import { FormActions } from "@/components/shared/FormActions";
import { Toggle } from "@/components/shared/Toggle";
import {
  createHeroSlide,
  updateHeroSlide,
  uploadHeroSlideImage,
  type HeroSlide,
  type HeroSlideTextPosition,
  type HeroSlideType,
  type HeroSlideVerticalPosition,
} from "@/lib/api/hero-slides";
import type { Category } from "@/lib/api/categories";
import type { ProductBrand } from "@/lib/api/product-brands";
import { ApiRequestError, resolveMediaUrl } from "@/lib/api/client";
import { flattenTree } from "@/lib/categories-tree";
import {
  HERO_SLIDE_BUTTON_LABEL_MAX_LENGTH,
  HERO_SLIDE_SUBTITLE_MAX_LENGTH,
  HERO_SLIDE_TITLE_MAX_LENGTH,
  heroSlideFormSchema,
} from "@/lib/validation/hero-slides";
import { getFieldErrors, type FieldErrors } from "@/lib/validation/common";

const TYPE_OPTIONS: { value: HeroSlideType; label: string }[] = [
  { value: "CTA", label: "ღილაკი (CTA)" },
  { value: "DISCOUNT", label: "ფასდაკლება (ბმული ავტომატურად)" },
  { value: "VEHICLE_SEARCH", label: "ტრანსპორტის ძებნის ფორმა" },
  { value: "CATEGORY_FILTER", label: "კატეგორიის არჩევის ფორმა" },
  { value: "INFO", label: "საინფორმაციო (ღილაკის/ფორმის გარეშე)" },
];

const TYPE_DESCRIPTIONS: Record<HeroSlideType, string> = {
  CTA: "ფონური სურათი, სათაური, ქვესათაური და ღილაკი, რომელიც მითითებულ ბმულზე გადადის.",
  DISCOUNT: "ფონური სურათი, სათაური, ქვესათაური და ღილაკი — ბმული ავტომატურად გამოითვლება არჩეული კატეგორია/ბრენდის მიხედვით (ან ზოგადი ფასდაკლების გვერდი, თუ არცერთი არ აირჩევა).",
  VEHICLE_SEARCH: "ფონური სურათი, სათაური, ქვესათაური და მარკა/მოდელი/წელი ძებნის ფორმა.",
  CATEGORY_FILTER: "ფონური სურათი, სათაური, ქვესათაური და კატეგორიის არჩევის ფორმა — მომხმარებელი აირჩევს კატეგორიას და გადავა შესაბამის გვერდზე.",
  INFO: "მხოლოდ ფონური სურათი, სათაური და ქვესათაური — არც ღილაკი, არც ფორმა.",
};

const TEXT_POSITION_OPTIONS: { value: HeroSlideTextPosition; label: string }[] = [
  { value: "LEFT", label: "მარცხნივ" },
  { value: "CENTER", label: "შუაში" },
  { value: "RIGHT", label: "მარჯვნივ" },
];

const VERTICAL_POSITION_OPTIONS: { value: HeroSlideVerticalPosition; label: string }[] = [
  { value: "TOP", label: "მაღლა" },
  { value: "MIDDLE", label: "შუაში" },
  { value: "BOTTOM", label: "დაბლა" },
];

function CharCount({ value, max }: { value: string; max: number }) {
  const isNearLimit = value.length > max * 0.9;
  return (
    <span className={`text-xs ${isNearLimit ? "text-amber-600" : "text-muted-foreground"}`}>
      {value.length}/{max}
    </span>
  );
}

export function HeroSlideFormModal({
  open,
  onClose,
  onSaved,
  slide,
  categories,
  productBrands,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  slide: HeroSlide | null;
  categories: Category[];
  productBrands: ProductBrand[];
}) {
  const isEditing = slide !== null;

  const [type, setType] = useState<HeroSlideType>(slide?.type ?? "CTA");
  const [titleKa, setTitleKa] = useState(slide?.title.ka ?? "");
  const [titleEn, setTitleEn] = useState(slide?.title.en ?? "");
  const [titleRu, setTitleRu] = useState(slide?.title.ru ?? "");
  const [subtitleKa, setSubtitleKa] = useState(slide?.subtitle?.ka ?? "");
  const [subtitleEn, setSubtitleEn] = useState(slide?.subtitle?.en ?? "");
  const [subtitleRu, setSubtitleRu] = useState(slide?.subtitle?.ru ?? "");
  const [buttonLabelKa, setButtonLabelKa] = useState(slide?.buttonLabel?.ka ?? "");
  const [buttonLabelEn, setButtonLabelEn] = useState(slide?.buttonLabel?.en ?? "");
  const [buttonLabelRu, setButtonLabelRu] = useState(slide?.buttonLabel?.ru ?? "");
  const [buttonLink, setButtonLink] = useState(slide?.buttonLink ?? "");
  const [discountCategoryId, setDiscountCategoryId] = useState(
    slide?.discountCategoryId ? String(slide.discountCategoryId) : "",
  );
  const [discountProductBrandId, setDiscountProductBrandId] = useState(
    slide?.discountProductBrandId ? String(slide.discountProductBrandId) : "",
  );
  const [textPosition, setTextPosition] = useState<HeroSlideTextPosition>(
    slide?.textPosition ?? "LEFT",
  );
  const [verticalPosition, setVerticalPosition] = useState<HeroSlideVerticalPosition>(
    slide?.verticalPosition ?? "BOTTOM",
  );
  const [isActive, setIsActive] = useState(slide?.isActive ?? true);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(resolveMediaUrl(slide?.imageUrl ?? null));
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});

  const categoryOptions = [
    { value: "", label: "ყველა კატეგორია" },
    ...flattenTree(categories).map((category) => ({
      value: String(category.id),
      label: `${"— ".repeat(category.depth)}${category.name.ka}`,
    })),
  ];
  const brandOptions = [
    { value: "", label: "ყველა ბრენდი" },
    ...productBrands.map((brand) => ({ value: String(brand.id), label: brand.name })),
  ];

  function handleImageChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    setImageFile(file);
    if (file) {
      setPreviewUrl(URL.createObjectURL(file));
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    const result = heroSlideFormSchema.safeParse({
      type,
      title: { ka: titleKa, en: titleEn, ru: titleRu },
      subtitleKa,
      subtitleEn,
      subtitleRu,
      buttonLabelKa,
      buttonLabelEn,
      buttonLabelRu,
      buttonLink,
    });
    if (!result.success) {
      setErrors(getFieldErrors(result.error));
      toast.error("გთხოვთ შეასწოროთ ველები");
      return;
    }
    setErrors({});

    setLoading(true);
    try {
      const hasSubtitle = subtitleKa.trim() || subtitleEn.trim() || subtitleRu.trim();
      const input = {
        type,
        title: { ka: titleKa.trim(), en: titleEn.trim(), ru: titleRu.trim() },
        subtitle: hasSubtitle
          ? { ka: subtitleKa.trim(), en: subtitleEn.trim(), ru: subtitleRu.trim() }
          : null,
        buttonLabel:
          type === "CTA" || type === "DISCOUNT"
            ? { ka: buttonLabelKa.trim(), en: buttonLabelEn.trim(), ru: buttonLabelRu.trim() }
            : null,
        buttonLink: type === "CTA" ? buttonLink.trim() : null,
        discountCategoryId:
          type === "DISCOUNT" && discountCategoryId ? Number(discountCategoryId) : null,
        discountProductBrandId:
          type === "DISCOUNT" && discountProductBrandId ? Number(discountProductBrandId) : null,
        textPosition,
        verticalPosition,
        isActive,
      };

      const saved = isEditing ? await updateHeroSlide(slide.id, input) : await createHeroSlide(input);

      if (imageFile) {
        try {
          await uploadHeroSlideImage(saved.id, imageFile);
        } catch {
          toast.error("სლაიდი შენახულია, მაგრამ სურათის ატვირთვა ვერ მოხერხდა");
          onSaved();
          onClose();
          return;
        }
      }

      toast.success(isEditing ? "სლაიდი განახლდა" : "სლაიდი დაემატა");
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
    <Modal open={open} onClose={onClose} title={isEditing ? "სლაიდის რედაქტირება" : "ახალი სლაიდი"} size="2xl">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium">ტიპი *</label>
          <Select options={TYPE_OPTIONS} value={type} onChange={(value) => setType(value as HeroSlideType)} />
          <p className="text-xs text-muted-foreground">{TYPE_DESCRIPTIONS[type]}</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="hero-title-ka" className="text-sm font-medium">
                სათაური (ქართულად) *
              </label>
              <CharCount value={titleKa} max={HERO_SLIDE_TITLE_MAX_LENGTH} />
            </div>
            <input
              id="hero-title-ka"
              value={titleKa}
              maxLength={HERO_SLIDE_TITLE_MAX_LENGTH}
              onChange={(event) => setTitleKa(event.target.value)}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            />
            <FieldError message={errors["title.ka"]} />
          </div>
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="hero-title-en" className="text-sm font-medium">
                სათაური (ინგლისურად) *
              </label>
              <CharCount value={titleEn} max={HERO_SLIDE_TITLE_MAX_LENGTH} />
            </div>
            <input
              id="hero-title-en"
              value={titleEn}
              maxLength={HERO_SLIDE_TITLE_MAX_LENGTH}
              onChange={(event) => setTitleEn(event.target.value)}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            />
            <FieldError message={errors["title.en"]} />
          </div>
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="hero-title-ru" className="text-sm font-medium">
                სათაური (რუსულად) *
              </label>
              <CharCount value={titleRu} max={HERO_SLIDE_TITLE_MAX_LENGTH} />
            </div>
            <input
              id="hero-title-ru"
              value={titleRu}
              maxLength={HERO_SLIDE_TITLE_MAX_LENGTH}
              onChange={(event) => setTitleRu(event.target.value)}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            />
            <FieldError message={errors["title.ru"]} />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">ტექსტის ჰორიზონტალური პოზიცია</label>
            <Select
              options={TEXT_POSITION_OPTIONS}
              value={textPosition}
              onChange={(value) => setTextPosition(value as HeroSlideTextPosition)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">ტექსტის ვერტიკალური პოზიცია</label>
            <Select
              options={VERTICAL_POSITION_OPTIONS}
              value={verticalPosition}
              onChange={(value) => setVerticalPosition(value as HeroSlideVerticalPosition)}
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="hero-subtitle-ka" className="text-sm font-medium">
                ქვესათაური (ქართულად)
              </label>
              <CharCount value={subtitleKa} max={HERO_SLIDE_SUBTITLE_MAX_LENGTH} />
            </div>
            <input
              id="hero-subtitle-ka"
              value={subtitleKa}
              maxLength={HERO_SLIDE_SUBTITLE_MAX_LENGTH}
              onChange={(event) => setSubtitleKa(event.target.value)}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="hero-subtitle-en" className="text-sm font-medium">
                ქვესათაური (ინგლისურად)
              </label>
              <CharCount value={subtitleEn} max={HERO_SLIDE_SUBTITLE_MAX_LENGTH} />
            </div>
            <input
              id="hero-subtitle-en"
              value={subtitleEn}
              maxLength={HERO_SLIDE_SUBTITLE_MAX_LENGTH}
              onChange={(event) => setSubtitleEn(event.target.value)}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="hero-subtitle-ru" className="text-sm font-medium">
                ქვესათაური (რუსულად)
              </label>
              <CharCount value={subtitleRu} max={HERO_SLIDE_SUBTITLE_MAX_LENGTH} />
            </div>
            <input
              id="hero-subtitle-ru"
              value={subtitleRu}
              maxLength={HERO_SLIDE_SUBTITLE_MAX_LENGTH}
              onChange={(event) => setSubtitleRu(event.target.value)}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </div>
        </div>

        {(type === "CTA" || type === "DISCOUNT") && (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label htmlFor="hero-button-ka" className="text-sm font-medium">
                    ღილაკის ტექსტი (ქართულად) *
                  </label>
                  <CharCount value={buttonLabelKa} max={HERO_SLIDE_BUTTON_LABEL_MAX_LENGTH} />
                </div>
                <input
                  id="hero-button-ka"
                  value={buttonLabelKa}
                  maxLength={HERO_SLIDE_BUTTON_LABEL_MAX_LENGTH}
                  onChange={(event) => setButtonLabelKa(event.target.value)}
                  className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                />
                <FieldError message={errors.buttonLabelKa} />
              </div>
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label htmlFor="hero-button-en" className="text-sm font-medium">
                    ღილაკის ტექსტი (ინგლისურად) *
                  </label>
                  <CharCount value={buttonLabelEn} max={HERO_SLIDE_BUTTON_LABEL_MAX_LENGTH} />
                </div>
                <input
                  id="hero-button-en"
                  value={buttonLabelEn}
                  maxLength={HERO_SLIDE_BUTTON_LABEL_MAX_LENGTH}
                  onChange={(event) => setButtonLabelEn(event.target.value)}
                  className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                />
                <FieldError message={errors.buttonLabelEn} />
              </div>
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label htmlFor="hero-button-ru" className="text-sm font-medium">
                    ღილაკის ტექსტი (რუსულად) *
                  </label>
                  <CharCount value={buttonLabelRu} max={HERO_SLIDE_BUTTON_LABEL_MAX_LENGTH} />
                </div>
                <input
                  id="hero-button-ru"
                  value={buttonLabelRu}
                  maxLength={HERO_SLIDE_BUTTON_LABEL_MAX_LENGTH}
                  onChange={(event) => setButtonLabelRu(event.target.value)}
                  className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                />
                <FieldError message={errors.buttonLabelRu} />
              </div>

              {type === "CTA" && (
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="hero-button-link" className="text-sm font-medium">
                    ღილაკის ბმული *
                  </label>
                  <input
                    id="hero-button-link"
                    value={buttonLink}
                    onChange={(event) => setButtonLink(event.target.value)}
                    placeholder="/shop?onSale=true"
                    className="rounded-lg border border-border bg-background px-3 py-2 text-sm font-mono outline-none focus:border-primary"
                  />
                  <FieldError message={errors.buttonLink} />
                </div>
              )}

              {type === "DISCOUNT" && (
                <>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium">კატეგორია (არასავალდებულო)</label>
                    <Select
                      options={categoryOptions}
                      value={discountCategoryId}
                      onChange={setDiscountCategoryId}
                      searchable
                      placeholder="ყველა კატეგორია"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium">ბრენდი (არასავალდებულო)</label>
                    <Select
                      options={brandOptions}
                      value={discountProductBrandId}
                      onChange={setDiscountProductBrandId}
                      searchable
                      placeholder="ყველა ბრენდი"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground sm:col-span-2">
                    თუ არცერთი არ აირჩევა, ღილაკი გადავა ზოგად ფასდაკლების გვერდზე. კატეგორია
                    ან/და ბრენდის მითითებით ღილაკი მხოლოდ იმ ფასდაკლებაზე გადავა (მაგ.
                    &quot;ზეთები&quot; + &quot;Motul&quot;).
                  </p>
                </>
              )}
            </div>
          </>
        )}

        <div className="flex flex-col gap-1.5">
          <label htmlFor="hero-image" className="text-sm font-medium">
            ფონური სურათი
          </label>
          <p className="text-xs text-muted-foreground">
            რეკომენდებული ზომა: 1920×800px (თანაფარდობა ~21:9), მაქს. 5MB, ფორმატი: jpg/png/webp.
          </p>
          {previewUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={previewUrl} alt="" className="h-40 w-full rounded-lg border border-border object-cover" />
          )}
          <input
            id="hero-image"
            type="file"
            accept="image/*"
            onChange={handleImageChange}
            className="text-sm text-muted-foreground file:mr-3 file:rounded-full file:border-0 file:bg-muted file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-foreground hover:file:bg-border"
          />
        </div>

        <label className="flex items-center gap-3 text-sm font-medium">
          <Toggle checked={isActive} onChange={setIsActive} />
          აქტიურია
        </label>

        <FormActions onCancel={onClose} loading={loading} />
      </form>
    </Modal>
  );
}
