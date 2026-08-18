"use client";

import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Modal } from "@/components/shared/Modal";
import { Select } from "@/components/shared/Select";
import { FieldError } from "@/components/shared/FieldError";
import { FormActions } from "@/components/shared/FormActions";
import {
  createProductBrand,
  updateProductBrand,
  uploadProductBrandLogo,
  type ProductBrand,
} from "@/lib/api/product-brands";
import type { Category } from "@/lib/api/categories";
import { ApiRequestError, resolveMediaUrl } from "@/lib/api/client";
import { flattenTree, slugify } from "@/lib/categories-tree";
import { productBrandFormSchema } from "@/lib/validation/product-brands";
import { getFieldErrors, type FieldErrors } from "@/lib/validation/common";

export function ProductBrandFormModal({
  open,
  onClose,
  onSaved,
  categories,
  productBrand,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  categories: Category[];
  productBrand: ProductBrand | null;
}) {
  const isEditing = productBrand !== null;
  const flatCategories = flattenTree(categories);

  const [categoryId, setCategoryId] = useState(
    productBrand ? String(productBrand.category.id) : "",
  );
  const [name, setName] = useState(productBrand?.name ?? "");
  const [slug, setSlug] = useState(productBrand?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(
    resolveMediaUrl(productBrand?.logoUrl ?? null),
  );
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});

  useEffect(() => {
    return () => {
      if (logoFile && previewUrl) URL.revokeObjectURL(previewUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewUrl]);

  function handleLogoChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    setLogoFile(file);
    if (file) {
      setPreviewUrl(URL.createObjectURL(file));
    }
  }

  const categoryOptions = flatCategories.map((category) => ({
    value: String(category.id),
    label: `${"— ".repeat(category.depth)}${category.name.ka}`,
  }));

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    const result = productBrandFormSchema.safeParse({
      categoryId,
      name,
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
        categoryId: Number(categoryId),
        name: name.trim(),
        slug: slug.trim(),
      };

      const saved = isEditing
        ? await updateProductBrand(productBrand.id, input)
        : await createProductBrand(input);

      if (logoFile) {
        try {
          await uploadProductBrandLogo(saved.id, logoFile);
        } catch {
          toast.error("ბრენდი შენახულია, მაგრამ ლოგოს ატვირთვა ვერ მოხერხდა");
          onSaved();
          onClose();
          return;
        }
      }

      toast.success(isEditing ? "ბრენდი განახლდა" : "ბრენდი დაემატა");
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
      title={isEditing ? "ბრენდის რედაქტირება" : "ახალი ბრენდი"}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="product-brand-category" className="text-sm font-medium">
            კატეგორია *
          </label>
          <Select
            id="product-brand-category"
            options={categoryOptions}
            value={categoryId}
            onChange={setCategoryId}
            searchable
            placeholder="აირჩიეთ კატეგორია"
          />
          <FieldError message={errors.categoryId} />
          <p className="text-xs text-muted-foreground">
            ბრენდი მემკვიდრეობით გადაეცემა ყველა შვილობილ კატეგორიასაც.
          </p>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="product-brand-name" className="text-sm font-medium">
            დასახელება *
          </label>
          <input
            id="product-brand-name"
            value={name}
            onChange={(event) => {
              const value = event.target.value;
              setName(value);
              if (!slugTouched) setSlug(slugify(value));
            }}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          />
          <FieldError message={errors.name} />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="product-brand-slug" className="text-sm font-medium">
            Slug *
          </label>
          <input
            id="product-brand-slug"
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
          <label htmlFor="product-brand-logo" className="text-sm font-medium">
            ლოგო
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
            id="product-brand-logo"
            type="file"
            accept="image/*"
            onChange={handleLogoChange}
            className="text-sm text-muted-foreground file:mr-3 file:rounded-full file:border-0 file:bg-muted file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-foreground hover:file:bg-border"
          />
          <p className="text-xs text-muted-foreground">
            რეკომენდებული ზომა 300×300px (გამჭვირვალე PNG)
          </p>
        </div>

        <FormActions onCancel={onClose} loading={loading} />
      </form>
    </Modal>
  );
}
