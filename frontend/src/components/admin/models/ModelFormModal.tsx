"use client";

import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Modal } from "@/components/shared/Modal";
import { Select } from "@/components/shared/Select";
import { createModel, updateModel, type Model } from "@/lib/api/models";
import type { Brand } from "@/lib/api/brands";
import { ApiRequestError } from "@/lib/api/client";
import { slugify } from "@/lib/categories-tree";

export function ModelFormModal({
  open,
  onClose,
  onSaved,
  brands,
  model,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  brands: Brand[];
  model: Model | null;
}) {
  const isEditing = model !== null;
  const [brandId, setBrandId] = useState<string>(
    model ? String(model.brandId) : brands[0] ? String(brands[0].id) : "",
  );
  const [nameKa, setNameKa] = useState(model?.name.ka ?? "");
  const [nameEn, setNameEn] = useState(model?.name.en ?? "");
  const [nameRu, setNameRu] = useState(model?.name.ru ?? "");
  const [slug, setSlug] = useState(model?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(false);
  const [loading, setLoading] = useState(false);

  const brandOptions = brands.map((brand) => ({ value: String(brand.id), label: brand.name.ka }));

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!brandId) {
      toast.error("აირჩიეთ მარკა");
      return;
    }
    setLoading(true);

    try {
      const input = {
        brandId: Number(brandId),
        name: { ka: nameKa.trim(), en: nameEn.trim(), ru: nameRu.trim() },
        slug: slug.trim(),
      };

      if (isEditing) {
        await updateModel(model.id, input);
      } else {
        await createModel(input);
      }

      toast.success(isEditing ? "მოდელი განახლდა" : "მოდელი დაემატა");
      onSaved();
      onClose();
    } catch (error) {
      const message =
        error instanceof ApiRequestError ? error.message : "შენახვა ვერ მოხერხდა";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={isEditing ? "მოდელის რედაქტირება" : "ახალი მოდელი"}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium">მარკა</label>
          <Select options={brandOptions} value={brandId} onChange={setBrandId} searchable />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="model-name-ka" className="text-sm font-medium">
            სახელი (ქართულად)
          </label>
          <input
            id="model-name-ka"
            required
            value={nameKa}
            onChange={(event) => setNameKa(event.target.value)}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="model-name-en" className="text-sm font-medium">
            სახელი (ინგლისურად)
          </label>
          <input
            id="model-name-en"
            required
            value={nameEn}
            onChange={(event) => {
              const value = event.target.value;
              setNameEn(value);
              if (!slugTouched) setSlug(slugify(value));
            }}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="model-name-ru" className="text-sm font-medium">
            სახელი (რუსულად)
          </label>
          <input
            id="model-name-ru"
            required
            value={nameRu}
            onChange={(event) => setNameRu(event.target.value)}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="model-slug" className="text-sm font-medium">
            Slug
          </label>
          <input
            id="model-slug"
            required
            value={slug}
            onChange={(event) => {
              setSlugTouched(true);
              setSlug(slugify(event.target.value));
            }}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm font-mono outline-none focus:border-primary"
          />
        </div>

        <div className="mt-2 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-border px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:border-primary hover:text-primary"
          >
            გაუქმება
          </button>
          <button
            type="submit"
            disabled={loading}
            className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover disabled:opacity-50"
          >
            {loading ? "ინახება..." : "შენახვა"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
