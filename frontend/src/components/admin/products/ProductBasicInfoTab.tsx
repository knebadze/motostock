"use client";

import { Select, type SelectOption } from "@/components/shared/Select";
import { LocalizedNameFields } from "@/components/shared/LocalizedNameFields";
import { FieldError } from "@/components/shared/FieldError";

export function ProductBasicInfoTab({
  categoryOptions,
  categoryId,
  onCategoryChange,
  categoryError,
  categoryLocked,
  productBrandOptions,
  productBrandId,
  onProductBrandChange,
  name,
  onNameChange,
  onEnglishChange,
  nameErrors,
}: {
  categoryOptions: SelectOption[];
  categoryId: string;
  onCategoryChange: (id: string) => void;
  categoryError?: string;
  // True once the product exists — category drives which attributes apply
  // to the product, so changing it on an existing product would leave
  // stale attribute values behind (see products.service.ts's updateProduct
  // for why this is enforced server-side too, not just here). Locked
  // instead of hidden so the admin can still see which category it's in.
  categoryLocked: boolean;
  productBrandOptions: SelectOption[];
  productBrandId: string;
  onProductBrandChange: (id: string) => void;
  name: { ka: string; en: string; ru: string };
  onNameChange: (next: { ka: string; en: string; ru: string }) => void;
  onEnglishChange: (value: string) => void;
  nameErrors: { ka?: string; en?: string; ru?: string };
}) {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="product-category" className="text-sm font-medium">
            კატეგორია *
          </label>
          <Select
            id="product-category"
            options={categoryOptions}
            value={categoryId}
            onChange={onCategoryChange}
            searchable
            disabled={categoryLocked}
            placeholder="აირჩიეთ კატეგორია"
          />
          {categoryLocked ? (
            <p className="text-xs text-muted-foreground">
              კატეგორიის შეცვლა შეუძლებელია არსებული პროდუქტისთვის — საჭიროების შემთხვევაში დაამატეთ ახალი პროდუქტი სწორი კატეგორიით
            </p>
          ) : (
            <FieldError message={categoryError} />
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="product-brand" className="text-sm font-medium">
            ბრენდი
          </label>
          <Select
            id="product-brand"
            options={productBrandOptions}
            value={productBrandId}
            onChange={onProductBrandChange}
            searchable
            disabled={!categoryId}
            placeholder={categoryId ? "— არცერთი —" : "ჯერ აირჩიეთ კატეგორია"}
          />
        </div>
      </div>

      <LocalizedNameFields
        idPrefix="product-name"
        value={name}
        onChange={onNameChange}
        onEnglishChange={onEnglishChange}
        errors={{ ka: nameErrors.ka, en: nameErrors.en, ru: nameErrors.ru }}
      />
    </>
  );
}
