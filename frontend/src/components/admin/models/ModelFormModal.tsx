"use client";

import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Modal } from "@/components/shared/Modal";
import { Select } from "@/components/shared/Select";
import { LocalizedNameFields } from "@/components/shared/LocalizedNameFields";
import { FormActions } from "@/components/shared/FormActions";
import { createModel, updateModel, type Model } from "@/lib/api/models";
import type { Brand } from "@/lib/api/brands";
import type { Category } from "@/lib/api/categories";
import { ApiRequestError } from "@/lib/api/client";
import { flattenTree, slugify } from "@/lib/categories-tree";

export function ModelFormModal({
  open,
  onClose,
  onSaved,
  brands,
  categories,
  model,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  brands: Brand[];
  categories: Category[];
  model: Model | null;
}) {
  const isEditing = model !== null;
  const [brandId, setBrandId] = useState<string>(
    model ? String(model.brandId) : brands[0] ? String(brands[0].id) : "",
  );
  const [categoryId, setCategoryId] = useState<string>(
    model?.categoryId != null ? String(model.categoryId) : "",
  );
  const [nameKa, setNameKa] = useState(model?.name.ka ?? "");
  const [nameEn, setNameEn] = useState(model?.name.en ?? "");
  const [nameRu, setNameRu] = useState(model?.name.ru ?? "");
  const [slug, setSlug] = useState(model?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(false);
  const [loading, setLoading] = useState(false);

  const brandOptions = brands.map((brand) => ({ value: String(brand.id), label: brand.name.ka }));
  const categoryOptions = flattenTree(categories).map((category) => ({
    value: String(category.id),
    label: `${"— ".repeat(category.depth)}${category.name.ka}`,
  }));

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
        categoryId: categoryId ? Number(categoryId) : null,
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
          <label className="text-sm font-medium">ტიპი (კატეგორია)</label>
          <Select
            options={categoryOptions}
            value={categoryId}
            onChange={setCategoryId}
            searchable
            placeholder="— არცერთი —"
          />
        </div>

        <LocalizedNameFields
          idPrefix="model-name"
          value={{ ka: nameKa, en: nameEn, ru: nameRu }}
          onChange={(next) => {
            setNameKa(next.ka);
            setNameEn(next.en);
            setNameRu(next.ru);
          }}
          onEnglishChange={(value) => {
            if (!slugTouched) setSlug(slugify(value));
          }}
        />

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

        <FormActions onCancel={onClose} loading={loading} />
      </form>
    </Modal>
  );
}
