"use client";

import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Modal } from "@/components/shared/Modal";
import { FieldError } from "@/components/shared/FieldError";
import { FormActions } from "@/components/shared/FormActions";
import { RichTextEditor } from "@/components/shared/RichTextEditor";
import { Toggle } from "@/components/shared/Toggle";
import { slugify } from "@/lib/categories-tree";
import { createVacancy, updateVacancy, type Vacancy } from "@/lib/api/vacancies";
import { ApiRequestError } from "@/lib/api/client";
import { vacancyFormSchema } from "@/lib/validation/vacancies";
import { getFieldErrors, type FieldErrors } from "@/lib/validation/common";

export function VacancyFormModal({
  open,
  onClose,
  onSaved,
  vacancy,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  vacancy: Vacancy | null;
}) {
  const isEditing = vacancy !== null;

  const [titleKa, setTitleKa] = useState(vacancy?.title.ka ?? "");
  const [titleEn, setTitleEn] = useState(vacancy?.title.en ?? "");
  const [titleRu, setTitleRu] = useState(vacancy?.title.ru ?? "");
  const [descriptionKa, setDescriptionKa] = useState(vacancy?.description.ka ?? "");
  const [descriptionEn, setDescriptionEn] = useState(vacancy?.description.en ?? "");
  const [descriptionRu, setDescriptionRu] = useState(vacancy?.description.ru ?? "");
  const [slug, setSlug] = useState(vacancy?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(false);
  const [isActive, setIsActive] = useState(vacancy?.isActive ?? true);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});

  // Auto-suggest the slug from the English title as the admin types it —
  // same "touched" convention as ProductForm.tsx's slug field. Derived from
  // the English title, not Georgian, since slugify() only keeps latin
  // characters/digits and would strip Georgian text to nothing.
  function handleTitleEnChange(value: string) {
    setTitleEn(value);
    if (!slugTouched) setSlug(slugify(value));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    const result = vacancyFormSchema.safeParse({
      title: { ka: titleKa, en: titleEn, ru: titleRu },
      description: { ka: descriptionKa, en: descriptionEn, ru: descriptionRu },
      slug,
    });
    if (!result.success) {
      setErrors(getFieldErrors(result.error));
      toast.error("გთხოვთ შეასწოროთ ველები");
      return;
    }
    setErrors({});

    setLoading(true);
    try {
      const input = {
        title: { ka: titleKa.trim(), en: titleEn.trim(), ru: titleRu.trim() },
        description: { ka: descriptionKa, en: descriptionEn, ru: descriptionRu },
        slug,
        isActive,
      };

      if (isEditing) {
        await updateVacancy(vacancy.id, input);
      } else {
        await createVacancy(input);
      }

      toast.success(isEditing ? "ვაკანსია განახლდა" : "ვაკანსია დაემატა");
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
      title={isEditing ? "ვაკანსიის რედაქტირება" : "ახალი ვაკანსია"}
      size="xl"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div className="flex flex-col gap-3 rounded-xl border border-border p-4">
          <p className="text-sm font-medium">სათაური</p>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="vacancy-title-ka" className="text-xs text-muted-foreground">
              ქართულად
            </label>
            <input
              id="vacancy-title-ka"
              value={titleKa}
              onChange={(event) => setTitleKa(event.target.value)}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            />
            <FieldError message={errors["title.ka"]} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="vacancy-title-en" className="text-xs text-muted-foreground">
              ინგლისურად
            </label>
            <input
              id="vacancy-title-en"
              value={titleEn}
              onChange={(event) => handleTitleEnChange(event.target.value)}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            />
            <FieldError message={errors["title.en"]} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="vacancy-title-ru" className="text-xs text-muted-foreground">
              რუსულად
            </label>
            <input
              id="vacancy-title-ru"
              value={titleRu}
              onChange={(event) => setTitleRu(event.target.value)}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            />
            <FieldError message={errors["title.ru"]} />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="vacancy-slug" className="text-sm font-medium">
            Slug (გვერდის მისამართი)
          </label>
          <input
            id="vacancy-slug"
            value={slug}
            onChange={(event) => {
              setSlugTouched(true);
              setSlug(event.target.value);
            }}
            placeholder="warehouse-manager"
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm font-mono outline-none focus:border-primary"
          />
          <FieldError message={errors.slug} />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium">აღწერა (ქართულად)</label>
          <RichTextEditor value={descriptionKa} onChange={setDescriptionKa} />
          <FieldError message={errors["description.ka"]} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium">აღწერა (ინგლისურად)</label>
          <RichTextEditor value={descriptionEn} onChange={setDescriptionEn} />
          <FieldError message={errors["description.en"]} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium">აღწერა (რუსულად)</label>
          <RichTextEditor value={descriptionRu} onChange={setDescriptionRu} />
          <FieldError message={errors["description.ru"]} />
        </div>

        <label className="flex items-center gap-3 text-sm font-medium">
          <Toggle checked={isActive} onChange={setIsActive} />
          აქტიურია (გამოჩნდება საიტზე)
        </label>

        <FormActions onCancel={onClose} loading={loading} />
      </form>
    </Modal>
  );
}
