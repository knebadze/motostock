"use client";

import { FieldError } from "@/components/shared/FieldError";
import { slugify } from "@/lib/categories-tree";

export function ProductSeoTab({
  slug,
  onSlugChange,
  metaTitle,
  onMetaTitleChange,
  metaDescription,
  onMetaDescriptionChange,
  errors,
}: {
  slug: string;
  onSlugChange: (value: string) => void;
  metaTitle: string;
  onMetaTitleChange: (value: string) => void;
  metaDescription: string;
  onMetaDescriptionChange: (value: string) => void;
  errors: { slug?: string; metaTitle?: string; metaDescription?: string };
}) {
  return (
    <>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="product-slug" className="text-sm font-medium">
          Slug *
        </label>
        <input
          id="product-slug"
          value={slug}
          onChange={(event) => onSlugChange(slugify(event.target.value))}
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm font-mono outline-none focus:border-primary"
        />
        <FieldError message={errors.slug} />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="product-meta-title" className="text-sm font-medium">
          Meta სათაური
        </label>
        <input
          id="product-meta-title"
          value={metaTitle}
          onChange={(event) => onMetaTitleChange(event.target.value)}
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
        />
        <p className="text-xs text-muted-foreground">
          {metaTitle.length}/70 სიმბოლო — ავტომატურად ივსება სახელიდან, სანამ ხელით არ შეასწორებ
        </p>
        <FieldError message={errors.metaTitle} />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="product-meta-description" className="text-sm font-medium">
          Meta აღწერა
        </label>
        <textarea
          id="product-meta-description"
          rows={3}
          value={metaDescription}
          onChange={(event) => onMetaDescriptionChange(event.target.value)}
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
        />
        <p className="text-xs text-muted-foreground">
          {metaDescription.length}/200 სიმბოლო — ავტომატურად ივსება აღწერიდან, სანამ ხელით არ
          შეასწორებ
        </p>
        <FieldError message={errors.metaDescription} />
      </div>
    </>
  );
}
