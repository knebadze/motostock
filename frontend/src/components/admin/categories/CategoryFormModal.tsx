"use client";

import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Modal } from "@/components/shared/Modal";
import { Select } from "@/components/shared/Select";
import {
  createCategory,
  updateCategory,
  uploadCategoryImage,
  type Category,
} from "@/lib/api/categories";
import { ApiRequestError, resolveMediaUrl } from "@/lib/api/client";
import { getDescendantIds, slugify } from "@/lib/categories-tree";

export function CategoryFormModal({
  open,
  onClose,
  onSaved,
  categories,
  category,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  categories: Category[];
  category: Category | null;
}) {
  const isEditing = category !== null;
  const [nameKa, setNameKa] = useState(category?.name.ka ?? "");
  const [nameEn, setNameEn] = useState(category?.name.en ?? "");
  const [nameRu, setNameRu] = useState(category?.name.ru ?? "");
  const [slug, setSlug] = useState(category?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(false);
  const [parentId, setParentId] = useState<string>(
    category?.parentId != null ? String(category.parentId) : "",
  );
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(
    resolveMediaUrl(category?.imageUrl ?? null),
  );
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    return () => {
      if (imageFile && previewUrl) URL.revokeObjectURL(previewUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewUrl]);

  const excludedIds = category ? getDescendantIds(categories, category.id) : new Set<number>();
  const parentOptions = categories
    .filter((item) => item.id !== category?.id && !excludedIds.has(item.id))
    .map((item) => ({ value: String(item.id), label: item.name.ka }));

  function handleImageChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    setImageFile(file);
    if (file) {
      setPreviewUrl(URL.createObjectURL(file));
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);

    try {
      const input = {
        name: { ka: nameKa.trim(), en: nameEn.trim(), ru: nameRu.trim() },
        slug: slug.trim(),
        parentId: parentId ? Number(parentId) : null,
      };

      const savedCategory = isEditing
        ? await updateCategory(category.id, input)
        : await createCategory(input);

      if (imageFile) {
        try {
          await uploadCategoryImage(savedCategory.id, imageFile);
        } catch {
          toast.error("კატეგორია შენახულია, მაგრამ სურათის ატვირთვა ვერ მოხერხდა");
          onSaved();
          onClose();
          return;
        }
      }

      toast.success(isEditing ? "კატეგორია განახლდა" : "კატეგორია დაემატა");
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
    <Modal
      open={open}
      onClose={onClose}
      title={isEditing ? "კატეგორიის რედაქტირება" : "ახალი კატეგორია"}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="category-name-ka" className="text-sm font-medium">
            სახელი (ქართულად)
          </label>
          <input
            id="category-name-ka"
            required
            value={nameKa}
            onChange={(event) => setNameKa(event.target.value)}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="category-name-en" className="text-sm font-medium">
            სახელი (ინგლისურად)
          </label>
          <input
            id="category-name-en"
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
          <label htmlFor="category-name-ru" className="text-sm font-medium">
            სახელი (რუსულად)
          </label>
          <input
            id="category-name-ru"
            required
            value={nameRu}
            onChange={(event) => setNameRu(event.target.value)}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="category-slug" className="text-sm font-medium">
            Slug
          </label>
          <input
            id="category-slug"
            required
            value={slug}
            onChange={(event) => {
              setSlugTouched(true);
              setSlug(slugify(event.target.value));
            }}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm font-mono outline-none focus:border-primary"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium">მშობელი კატეგორია</label>
          <Select
            options={parentOptions}
            value={parentId}
            onChange={setParentId}
            searchable
            placeholder="— არცერთი —"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="category-image" className="text-sm font-medium">
            სურათი
          </label>
          {previewUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewUrl}
              alt=""
              className="h-24 w-24 rounded-lg border border-border object-cover"
            />
          )}
          <input
            id="category-image"
            type="file"
            accept="image/*"
            onChange={handleImageChange}
            className="text-sm text-muted-foreground file:mr-3 file:rounded-full file:border-0 file:bg-muted file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-foreground hover:file:bg-border"
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
