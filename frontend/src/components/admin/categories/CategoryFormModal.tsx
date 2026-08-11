"use client";

import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Modal } from "@/components/shared/Modal";
import { Select } from "@/components/shared/Select";
import { LocalizedNameFields } from "@/components/shared/LocalizedNameFields";
import { FieldError } from "@/components/shared/FieldError";
import { FormActions } from "@/components/shared/FormActions";
import {
  createCategory,
  updateCategory,
  uploadCategoryBannerImage,
  uploadCategoryImage,
  type Category,
} from "@/lib/api/categories";
import { ApiRequestError, resolveMediaUrl } from "@/lib/api/client";
import { getDescendantIds, slugify } from "@/lib/categories-tree";
import { categoryFormSchema } from "@/lib/validation/categories";
import { getFieldErrors, type FieldErrors } from "@/lib/validation/common";

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
  const [sortOrder, setSortOrder] = useState(category?.sortOrder ?? 0);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(
    resolveMediaUrl(category?.imageUrl ?? null),
  );
  const [bannerImageFile, setBannerImageFile] = useState<File | null>(null);
  const [bannerPreviewUrl, setBannerPreviewUrl] = useState<string | null>(
    resolveMediaUrl(category?.bannerImageUrl ?? null),
  );
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});

  useEffect(() => {
    return () => {
      if (imageFile && previewUrl) URL.revokeObjectURL(previewUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewUrl]);

  useEffect(() => {
    return () => {
      if (bannerImageFile && bannerPreviewUrl) URL.revokeObjectURL(bannerPreviewUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bannerPreviewUrl]);

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

  function handleBannerImageChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    setBannerImageFile(file);
    if (file) {
      setBannerPreviewUrl(URL.createObjectURL(file));
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    const result = categoryFormSchema.safeParse({
      name: { ka: nameKa, en: nameEn, ru: nameRu },
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
        name: { ka: nameKa.trim(), en: nameEn.trim(), ru: nameRu.trim() },
        slug: slug.trim(),
        parentId: parentId ? Number(parentId) : null,
        sortOrder,
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

      if (bannerImageFile) {
        try {
          await uploadCategoryBannerImage(savedCategory.id, bannerImageFile);
        } catch {
          toast.error("კატეგორია შენახულია, მაგრამ hero ბანერის ატვირთვა ვერ მოხერხდა");
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
      size="xl"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <LocalizedNameFields
          idPrefix="category-name"
          value={{ ka: nameKa, en: nameEn, ru: nameRu }}
          onChange={(next) => {
            setNameKa(next.ka);
            setNameEn(next.en);
            setNameRu(next.ru);
          }}
          onEnglishChange={(value) => {
            if (!slugTouched) setSlug(slugify(value));
          }}
          errors={{ ka: errors["name.ka"], en: errors["name.en"], ru: errors["name.ru"] }}
        />

        <div className="flex flex-col gap-1.5">
          <label htmlFor="category-slug" className="text-sm font-medium">
            Slug *
          </label>
          <input
            id="category-slug"
            value={slug}
            onChange={(event) => {
              setSlugTouched(true);
              setSlug(slugify(event.target.value));
            }}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm font-mono outline-none focus:border-primary"
          />
          <FieldError message={errors.slug} />
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
          <label htmlFor="category-sort-order" className="text-sm font-medium">
            თანმიმდევრობა
          </label>
          <input
            id="category-sort-order"
            type="number"
            value={sortOrder}
            onChange={(event) => setSortOrder(Number(event.target.value))}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          />
          <p className="text-xs text-muted-foreground">
            პატარა რიცხვი უფრო ადრე გამოჩნდება ჰეადერის მენიუში
          </p>
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

        <div className="flex flex-col gap-1.5">
          <label htmlFor="category-banner-image" className="text-sm font-medium">
            Hero ბანერის სურათი
          </label>
          {bannerPreviewUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={bannerPreviewUrl}
              alt=""
              className="h-24 w-full rounded-lg border border-border object-cover"
            />
          )}
          <input
            id="category-banner-image"
            type="file"
            accept="image/*"
            onChange={handleBannerImageChange}
            className="text-sm text-muted-foreground file:mr-3 file:rounded-full file:border-0 file:bg-muted file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-foreground hover:file:bg-border"
          />
          <p className="text-xs text-muted-foreground">
            გამოიყენება შოპის გვერდის თავში, ცალკეა ზემოთა კვადრატული სურათისგან — რეკომენდებული
            ზომა 1920×480px (ფართო ბანერი), თორემ სურათი გაჭიმული/დაბლურებული გამოჩნდება
          </p>
        </div>

        <FormActions onCancel={onClose} loading={loading} />
      </form>
    </Modal>
  );
}
