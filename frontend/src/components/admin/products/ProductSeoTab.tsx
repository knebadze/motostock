"use client";

import { FieldError } from "@/components/shared/FieldError";
import { slugify } from "@/lib/categories-tree";

export type SeoLocale = "ka" | "en" | "ru";
export type LocalizedMeta = Record<SeoLocale, string>;

const LOCALE_SECTIONS: { locale: SeoLocale; label: string; suffix: "Ka" | "En" | "Ru" }[] = [
  { locale: "ka", label: "ქართული", suffix: "Ka" },
  { locale: "en", label: "English", suffix: "En" },
  { locale: "ru", label: "Русский", suffix: "Ru" },
];

// One title/description pair per storefront locale — each is what Google
// shows for that language's version of the page (/ka/…, /en/…, /ru/…).
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
  metaTitle: LocalizedMeta;
  onMetaTitleChange: (locale: SeoLocale, value: string) => void;
  metaDescription: LocalizedMeta;
  onMetaDescriptionChange: (locale: SeoLocale, value: string) => void;
  // Keyed like the API fields: slug, metaTitleKa, metaDescriptionEn, ...
  errors: Record<string, string | undefined>;
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

      <p className="text-xs text-muted-foreground">
        თითოეული ენის სათაური და აღწერა ავტომატურად ივსება იმავე ენის სახელიდან და აღწერიდან, სანამ ხელით
        არ შეასწორებ. ცარიელი ველის შემთხვევაში საიტი იმავე ენის სახელს/აღწერას გამოიყენებს.
      </p>

      {LOCALE_SECTIONS.map(({ locale, label, suffix }) => (
        <fieldset key={locale} className="flex flex-col gap-3 rounded-xl border border-border p-4">
          <legend className="px-1 text-sm font-semibold">{label}</legend>

          <div className="flex flex-col gap-1.5">
            <label htmlFor={`product-meta-title-${locale}`} className="text-sm font-medium">
              Meta სათაური
            </label>
            <input
              id={`product-meta-title-${locale}`}
              value={metaTitle[locale]}
              onChange={(event) => onMetaTitleChange(locale, event.target.value)}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            />
            <p className="text-xs text-muted-foreground">{metaTitle[locale].length}/70 სიმბოლო</p>
            <FieldError message={errors[`metaTitle${suffix}`]} />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor={`product-meta-description-${locale}`} className="text-sm font-medium">
              Meta აღწერა
            </label>
            <textarea
              id={`product-meta-description-${locale}`}
              rows={3}
              value={metaDescription[locale]}
              onChange={(event) => onMetaDescriptionChange(locale, event.target.value)}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            />
            <p className="text-xs text-muted-foreground">{metaDescription[locale].length}/200 სიმბოლო</p>
            <FieldError message={errors[`metaDescription${suffix}`]} />
          </div>
        </fieldset>
      ))}
    </>
  );
}
