"use client";

import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Modal } from "@/components/shared/Modal";
import { LocalizedNameFields } from "@/components/shared/LocalizedNameFields";
import { FormActions } from "@/components/shared/FormActions";
import { createBrand, updateBrand, uploadBrandLogo, type Brand } from "@/lib/api/brands";
import { ApiRequestError, resolveMediaUrl } from "@/lib/api/client";
import { slugify } from "@/lib/categories-tree";

export function BrandFormModal({
  open,
  onClose,
  onSaved,
  brand,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  brand: Brand | null;
}) {
  const isEditing = brand !== null;
  const [nameKa, setNameKa] = useState(brand?.name.ka ?? "");
  const [nameEn, setNameEn] = useState(brand?.name.en ?? "");
  const [nameRu, setNameRu] = useState(brand?.name.ru ?? "");
  const [slug, setSlug] = useState(brand?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(
    resolveMediaUrl(brand?.logoUrl ?? null),
  );
  const [loading, setLoading] = useState(false);

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

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);

    try {
      const input = {
        name: { ka: nameKa.trim(), en: nameEn.trim(), ru: nameRu.trim() },
        slug: slug.trim(),
      };

      const savedBrand = isEditing ? await updateBrand(brand.id, input) : await createBrand(input);

      if (logoFile) {
        try {
          await uploadBrandLogo(savedBrand.id, logoFile);
        } catch {
          toast.error("მარკა შენახულია, მაგრამ ლოგოს ატვირთვა ვერ მოხერხდა");
          onSaved();
          onClose();
          return;
        }
      }

      toast.success(isEditing ? "მარკა განახლდა" : "მარკა დაემატა");
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
    <Modal open={open} onClose={onClose} title={isEditing ? "მარკის რედაქტირება" : "ახალი მარკა"}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <LocalizedNameFields
          idPrefix="brand-name"
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
          <label htmlFor="brand-slug" className="text-sm font-medium">
            Slug
          </label>
          <input
            id="brand-slug"
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
          <label htmlFor="brand-logo" className="text-sm font-medium">
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
            id="brand-logo"
            type="file"
            accept="image/*"
            onChange={handleLogoChange}
            className="text-sm text-muted-foreground file:mr-3 file:rounded-full file:border-0 file:bg-muted file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-foreground hover:file:bg-border"
          />
        </div>

        <FormActions onCancel={onClose} loading={loading} />
      </form>
    </Modal>
  );
}
