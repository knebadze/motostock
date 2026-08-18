"use client";

import { Select, type SelectOption } from "@/components/shared/Select";
import { LocalizedNameFields } from "@/components/shared/LocalizedNameFields";
import { FieldError } from "@/components/shared/FieldError";

export function ProductBasicInfoTab({
  categoryOptions,
  categoryId,
  onCategoryChange,
  categoryError,
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
            placeholder="აირჩიეთ კატეგორია"
          />
          <FieldError message={categoryError} />
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
