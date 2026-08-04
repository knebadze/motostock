"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Select } from "@/components/shared/Select";
import { LocalizedNameFields } from "@/components/shared/LocalizedNameFields";
import { FieldError } from "@/components/shared/FieldError";
import { FormActions } from "@/components/shared/FormActions";
import { RichTextEditor } from "@/components/shared/RichTextEditor";
import { Tabs } from "@/components/shared/Tabs";
import { Toggle } from "@/components/shared/Toggle";
import {
  createProduct,
  updateProduct,
  uploadProductImage,
  type Product,
  type ProductAttributeValueInput,
} from "@/lib/api/products";
import { createProductVariant } from "@/lib/api/product-variants";
import { siteConfig } from "@/config/site";
import { uploadProductVariantImages } from "@/lib/api/product-variant-images";
import { createProductVariantDiscount } from "@/lib/api/product-variant-discounts";
import { createProductFitment } from "@/lib/api/product-fitment";
import type { Attribute } from "@/lib/api/attributes";
import type { Category } from "@/lib/api/categories";
import { listProductBrands, type ProductBrand } from "@/lib/api/product-brands";
import type { LookupItem } from "@/lib/api/lookups";
import type { VehicleCatalogEntry } from "@/lib/api/vehicle-catalog";
import { ApiRequestError, resolveMediaUrl } from "@/lib/api/client";
import { flattenTree, slugify } from "@/lib/categories-tree";
import { generateVariantCombinations } from "@/lib/variant-matrix";
import { productFormSchema, buildAttributeValuesSchema, type AttributeFieldValue } from "@/lib/validation/products";
import { productVariantFormSchema } from "@/lib/validation/product-variants";
import { productVariantDiscountFormSchema } from "@/lib/validation/product-variant-discounts";
import { getFieldErrors, type FieldErrors } from "@/lib/validation/common";
import { ProductAttributeFields } from "./ProductAttributeFields";
import { ProductVariantsPanel } from "./ProductVariantsPanel";
import { ProductVariantImagesPanel } from "./ProductVariantImagesPanel";
import {
  ProductFitmentPanel,
  DraftFitmentEditor,
  type DraftFitment,
  type VehicleSpecLookupMap,
} from "./ProductFitmentPanel";
import { ProductBuyTogetherPanel } from "./ProductBuyTogetherPanel";

function lookupOptions(items: LookupItem[]) {
  return items.map((item) => ({ value: String(item.id), label: item.nameKa }));
}

function toNullableHtml(html: string): string | null {
  const isBlank = html.replace(/<[^>]*>/g, "").trim() === "";
  return isBlank ? null : html;
}

function toAttributeFieldValues(product: Product | null): Record<string, AttributeFieldValue> {
  if (!product) return {};
  const result: Record<string, AttributeFieldValue> = {};
  for (const value of product.attributeValues) {
    result[String(value.attributeId)] = {
      text: value.valueText ?? "",
      number: value.valueNumber != null ? String(value.valueNumber) : "",
      boolean: value.valueBoolean ?? false,
      optionId: value.option ? String(value.option.id) : "",
    };
  }
  return result;
}

const EMPTY_ATTRIBUTE_FIELD_VALUE: AttributeFieldValue = {
  text: "",
  number: "",
  boolean: false,
  optionId: "",
};

// Attributes the admin hasn't touched yet have no entry in `attributeValues`
// (ProductAttributeFields only writes an entry on change) — the validation
// schema requires a full object per attribute id, so fill the gaps with the
// same default used for rendering before parsing.
function withAttributeDefaults(
  values: Record<string, AttributeFieldValue>,
  attributes: Attribute[],
): Record<string, AttributeFieldValue> {
  const filled: Record<string, AttributeFieldValue> = { ...values };
  for (const attribute of attributes) {
    filled[String(attribute.id)] ??= EMPTY_ATTRIBUTE_FIELD_VALUE;
  }
  return filled;
}

function toAttributeValueInputs(
  values: Record<string, AttributeFieldValue>,
  attributes: Attribute[],
): ProductAttributeValueInput[] {
  const inputs: ProductAttributeValueInput[] = [];

  for (const attribute of attributes) {
    const value = values[String(attribute.id)];
    if (!value) continue;

    if (attribute.valueType === "TEXT" && value.text.trim() !== "") {
      inputs.push({ attributeId: attribute.id, valueText: value.text.trim() });
    } else if (attribute.valueType === "NUMBER" && value.number.trim() !== "") {
      inputs.push({ attributeId: attribute.id, valueNumber: Number(value.number) });
    } else if (attribute.valueType === "BOOLEAN") {
      inputs.push({ attributeId: attribute.id, valueBoolean: value.boolean });
    } else if (attribute.valueType === "SELECT" && value.optionId.trim() !== "") {
      inputs.push({ attributeId: attribute.id, optionId: Number(value.optionId) });
    }
  }

  return inputs;
}

type DraftVariant = {
  draftId: number;
  sizeId: number | null;
  colorId: number | null;
  conditionId: number | null;
  statusId: number | null;
  price: string;
  stockQuantity: string;
  sku: string;
  isActive: boolean;
};

function DraftVariantsTable({
  variants,
  sizes,
  colors,
  onChange,
  onRemove,
}: {
  variants: DraftVariant[];
  sizes: LookupItem[];
  colors: LookupItem[];
  onChange: (draftId: number, patch: Partial<DraftVariant>) => void;
  onRemove: (draftId: number) => void;
}) {
  if (variants.length === 0) return null;

  function labelFor(items: LookupItem[], id: number | null) {
    if (id == null) return "—";
    return items.find((item) => item.id === id)?.nameKa ?? "—";
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-border">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-border bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="px-4 py-3 font-medium">ზომა</th>
            <th className="px-4 py-3 font-medium">ფერი</th>
            <th className="px-4 py-3 font-medium">SKU</th>
            <th className="px-4 py-3 font-medium">ფასი</th>
            <th className="px-4 py-3 font-medium">მარაგი</th>
            <th className="px-4 py-3 font-medium text-right">მოქმედება</th>
          </tr>
        </thead>
        <tbody>
          {variants.map((variant) => (
            <tr key={variant.draftId} className="border-b border-border last:border-0">
              <td className="px-4 py-2 text-muted-foreground">{labelFor(sizes, variant.sizeId)}</td>
              <td className="px-4 py-2 text-muted-foreground">{labelFor(colors, variant.colorId)}</td>
              <td className="px-4 py-2">
                <input
                  type="text"
                  value={variant.sku}
                  onChange={(event) => onChange(variant.draftId, { sku: event.target.value })}
                  className="w-28 rounded-lg border border-border bg-background px-2 py-1 text-sm font-mono outline-none focus:border-primary"
                />
              </td>
              <td className="px-4 py-2">
                <input
                  type="number"
                  step="0.01"
                  value={variant.price}
                  onChange={(event) => onChange(variant.draftId, { price: event.target.value })}
                  className="w-24 rounded-lg border border-border bg-background px-2 py-1 text-sm outline-none focus:border-primary"
                />
              </td>
              <td className="px-4 py-2">
                <input
                  type="number"
                  min={0}
                  value={variant.stockQuantity}
                  onChange={(event) => onChange(variant.draftId, { stockQuantity: event.target.value })}
                  className="w-20 rounded-lg border border-border bg-background px-2 py-1 text-sm outline-none focus:border-primary"
                />
              </td>
              <td className="px-4 py-2 text-right">
                <button
                  type="button"
                  onClick={() => onRemove(variant.draftId)}
                  className="rounded-full px-3 py-1 text-xs font-semibold text-red-600 transition-colors hover:bg-red-500/10"
                >
                  წაშლა
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ProductForm({
  categories,
  sizes,
  colors,
  conditions,
  statuses,
  vehicleCatalog,
  vehicleSpecLookups,
  allProducts,
  product,
}: {
  categories: Category[];
  sizes: LookupItem[];
  colors: LookupItem[];
  conditions: LookupItem[];
  statuses: LookupItem[];
  vehicleCatalog: VehicleCatalogEntry[];
  vehicleSpecLookups: VehicleSpecLookupMap;
  allProducts: Product[];
  product: Product | null;
}) {
  const router = useRouter();
  const isEditing = product !== null;
  const flatCategories = flattenTree(categories);

  const [categoryId, setCategoryId] = useState(product ? String(product.category.id) : "");
  const [productBrandId, setProductBrandId] = useState(
    product?.productBrand ? String(product.productBrand.id) : "",
  );
  const [categoryProductBrands, setCategoryProductBrands] = useState<ProductBrand[]>([]);
  const [nameKa, setNameKa] = useState(product?.name.ka ?? "");
  const [nameEn, setNameEn] = useState(product?.name.en ?? "");
  const [nameRu, setNameRu] = useState(product?.name.ru ?? "");
  const [slug, setSlug] = useState(product?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(false);
  const [metaTitle, setMetaTitle] = useState(product?.metaTitle ?? "");
  const [metaTitleTouched, setMetaTitleTouched] = useState((product?.metaTitle ?? "") !== "");
  const [metaDescription, setMetaDescription] = useState(product?.metaDescription ?? "");
  const [metaDescriptionTouched, setMetaDescriptionTouched] = useState(
    (product?.metaDescription ?? "") !== "",
  );
  const [descriptionKa, setDescriptionKa] = useState(product?.descriptionKa ?? "");
  const [descriptionEn, setDescriptionEn] = useState(product?.descriptionEn ?? "");
  const [descriptionRu, setDescriptionRu] = useState(product?.descriptionRu ?? "");
  const [attributeValues, setAttributeValues] = useState<Record<string, AttributeFieldValue>>(
    () => toAttributeFieldValues(product),
  );
  const [categoryAttributes, setCategoryAttributes] = useState<Attribute[]>([]);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(
    resolveMediaUrl(product?.imageUrl ?? null),
  );
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});

  // Create-flow only: an optional variant matrix (one or more sellable
  // variants generated from selected size/color combinations, + images +
  // discount) filled in and saved together with the product in one action.
  // Left empty, the product is created spec-only exactly like before. Once a
  // product exists, further variants are managed through the full
  // ProductVariantsPanel (edit mode) instead.
  const [initialSizeIds, setInitialSizeIds] = useState<string[]>([]);
  const [initialColorIds, setInitialColorIds] = useState<string[]>([]);
  const [initialConditionId, setInitialConditionId] = useState(() =>
    product ? "" : String(conditions.find((c) => c.key === "NEW")?.id ?? ""),
  );
  const [initialStatusId, setInitialStatusId] = useState(() =>
    product ? "" : String(statuses.find((s) => s.key === "AVAILABLE")?.id ?? ""),
  );
  const [initialBasePrice, setInitialBasePrice] = useState("");
  const [initialBaseStockQuantity, setInitialBaseStockQuantity] = useState("1");
  const [initialBaseSku, setInitialBaseSku] = useState("");
  const [initialIsActive, setInitialIsActive] = useState(true);
  const [draftVariants, setDraftVariants] = useState<DraftVariant[]>([]);
  const nextDraftVariantId = useRef(0);

  const [initialDiscountPercent, setInitialDiscountPercent] = useState("");
  const [initialDiscountPrice, setInitialDiscountPrice] = useState("");
  const [initialDiscountStartDate, setInitialDiscountStartDate] = useState("");
  const [initialDiscountEndDate, setInitialDiscountEndDate] = useState("");
  const pendingVariantImageFilesRef = useRef<File[]>([]);

  // Same create-time batching as the variant matrix above: fitment links are
  // held locally until the product actually exists, then created right after
  // it's saved.
  const [draftFitments, setDraftFitments] = useState<DraftFitment[]>([]);

  function addDraftFitment(vehicleCatalogId: number) {
    setDraftFitments((prev) => [...prev, { vehicleCatalogId }]);
  }

  function removeDraftFitment(vehicleCatalogId: number) {
    setDraftFitments((prev) => prev.filter((fitment) => fitment.vehicleCatalogId !== vehicleCatalogId));
  }

  useEffect(() => {
    return () => {
      if (imageFile && previewUrl) URL.revokeObjectURL(previewUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewUrl]);

  // Auto-generate the meta title/description from the name and description
  // as the admin types them (see the onChange handlers below) — same
  // "touched" convention as slug: stops overriding as soon as the admin
  // edits the meta field directly, and never overwrites a value a product
  // already had when this form opened (see the touched-state initializers).
  function handleNameChange(next: { ka: string; en: string; ru: string }) {
    setNameKa(next.ka);
    setNameEn(next.en);
    setNameRu(next.ru);
    if (!metaTitleTouched && next.ka) {
      setMetaTitle(`${next.ka} | ${siteConfig.name}`.slice(0, 70));
    }
  }

  function handleDescriptionKaChange(html: string) {
    setDescriptionKa(html);
    if (!metaDescriptionTouched) {
      const plainText = html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
      setMetaDescription(plainText.slice(0, 160));
    }
  }

  // Product brands are category-scoped (with tree inheritance, resolved
  // server-side) rather than a single global list, so they're refetched
  // whenever the selected category changes — same pattern as
  // ProductAttributeFields.
  useEffect(() => {
    if (!categoryId) return;

    let cancelled = false;
    listProductBrands(Number(categoryId)).then((items) => {
      if (!cancelled) setCategoryProductBrands(items);
    });

    return () => {
      cancelled = true;
    };
  }, [categoryId]);

  const categoryOptions = flatCategories.map((category) => ({
    value: String(category.id),
    label: `${"— ".repeat(category.depth)}${category.name.ka}`,
  }));
  const productBrandOptions = categoryProductBrands.map((productBrand) => ({
    value: String(productBrand.id),
    label: productBrand.name.ka,
  }));

  function handleCategoryChange(nextCategoryId: string) {
    setCategoryId(nextCategoryId);
    setAttributeValues({});
    setProductBrandId("");
  }

  function handleAttributeChange(attributeId: number, value: AttributeFieldValue) {
    setAttributeValues((current) => ({ ...current, [String(attributeId)]: value }));
  }

  function handleImageChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    setImageFile(file);
    if (file) {
      setPreviewUrl(URL.createObjectURL(file));
    }
  }

  function handleGenerateDraftVariants() {
    const priceCheck = productVariantFormSchema.safeParse({
      price: initialBasePrice,
      stockQuantity: initialBaseStockQuantity,
    });
    if (!priceCheck.success) {
      setErrors(getFieldErrors(priceCheck.error));
      toast.error("გთხოვთ შეასწოროთ ველები");
      return;
    }
    setErrors({});

    const combinations = generateVariantCombinations(
      initialSizeIds.map(Number),
      initialColorIds.map(Number),
    );
    const conditionId = initialConditionId ? Number(initialConditionId) : null;
    const statusId = initialStatusId ? Number(initialStatusId) : null;

    setDraftVariants((prev) => [
      ...prev,
      ...combinations.map((combo) => ({
        draftId: nextDraftVariantId.current++,
        sizeId: combo.sizeId,
        colorId: combo.colorId,
        conditionId,
        statusId,
        price: initialBasePrice,
        stockQuantity: initialBaseStockQuantity,
        sku: initialBaseSku,
        isActive: initialIsActive,
      })),
    ]);
  }

  function updateDraftVariant(draftId: number, patch: Partial<DraftVariant>) {
    setDraftVariants((prev) =>
      prev.map((variant) => (variant.draftId === draftId ? { ...variant, ...patch } : variant)),
    );
  }

  function removeDraftVariant(draftId: number) {
    setDraftVariants((prev) => prev.filter((variant) => variant.draftId !== draftId));
  }

  function handleInitialDiscountPercentChange(value: string) {
    setInitialDiscountPercent(value);

    const percentNum = Number(value);
    const priceNum = Number(initialBasePrice);
    if (
      value.trim() !== "" &&
      Number.isFinite(percentNum) &&
      percentNum >= 0 &&
      percentNum <= 100 &&
      initialBasePrice.trim() !== ""
    ) {
      setInitialDiscountPrice((priceNum * (1 - percentNum / 100)).toFixed(2));
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    const mainResult = productFormSchema.safeParse({
      categoryId,
      name: { ka: nameKa, en: nameEn, ru: nameRu },
      slug,
      metaTitle: metaTitle || undefined,
      metaDescription: metaDescription || undefined,
    });
    const attributeResult = buildAttributeValuesSchema(categoryAttributes).safeParse(
      withAttributeDefaults(attributeValues, categoryAttributes),
    );
    const wantsInitialDiscount = draftVariants.length > 0 && initialDiscountPrice.trim() !== "";
    const discountResult = wantsInitialDiscount
      ? productVariantDiscountFormSchema.safeParse({
          discountPrice: initialDiscountPrice,
          discountPercent: initialDiscountPercent,
          startDate: initialDiscountStartDate,
          endDate: initialDiscountEndDate,
        })
      : null;

    if (!mainResult.success || !attributeResult.success || discountResult?.success === false) {
      setErrors({
        ...(mainResult.success ? {} : getFieldErrors(mainResult.error)),
        ...(attributeResult.success ? {} : getFieldErrors(attributeResult.error)),
        ...(discountResult?.success === false ? getFieldErrors(discountResult.error) : {}),
      });
      toast.error("გთხოვთ შეასწოროთ ველები");
      return;
    }
    setErrors({});

    setLoading(true);

    try {
      const input = {
        categoryId: Number(categoryId),
        productBrandId: productBrandId ? Number(productBrandId) : null,
        name: { ka: nameKa.trim(), en: nameEn.trim(), ru: nameRu.trim() },
        slug: slug.trim(),
        metaTitle: metaTitle.trim() ? metaTitle.trim() : null,
        metaDescription: metaDescription.trim() ? metaDescription.trim() : null,
        descriptionKa: toNullableHtml(descriptionKa),
        descriptionEn: toNullableHtml(descriptionEn),
        descriptionRu: toNullableHtml(descriptionRu),
        attributeValues: toAttributeValueInputs(attributeValues, categoryAttributes),
      };

      const saved = isEditing
        ? await updateProduct(product.id, input)
        : await createProduct(input);

      if (imageFile) {
        try {
          await uploadProductImage(saved.id, imageFile);
        } catch {
          toast.error("პროდუქტი შენახულია, მაგრამ სურათის ატვირთვა ვერ მოხერხდა");
          router.push("/admin/products");
          return;
        }
      }

      if (!isEditing && draftVariants.length > 0) {
        try {
          let firstVariantId: number | null = null;
          for (const draft of draftVariants) {
            const variant = await createProductVariant({
              productId: saved.id,
              sizeId: draft.sizeId,
              colorId: draft.colorId,
              conditionId: draft.conditionId,
              statusId: draft.statusId,
              price: Number(draft.price),
              stockQuantity: draft.stockQuantity ? Number(draft.stockQuantity) : undefined,
              sku: draft.sku.trim() ? draft.sku.trim() : null,
              isActive: draft.isActive,
            });
            if (firstVariantId === null) firstVariantId = variant.id;
          }

          if (firstVariantId !== null && pendingVariantImageFilesRef.current.length > 0) {
            await uploadProductVariantImages(firstVariantId, pendingVariantImageFilesRef.current);
          }

          if (firstVariantId !== null && wantsInitialDiscount) {
            await createProductVariantDiscount(firstVariantId, {
              discountPrice: Number(initialDiscountPrice),
              discountPercent: initialDiscountPercent ? Number(initialDiscountPercent) : null,
              startDate: initialDiscountStartDate,
              endDate: initialDiscountEndDate,
            });
          }
        } catch {
          toast.error(
            "პროდუქტი შენახულია, მაგრამ ვარიანტების დამატება ვერ მოხერხდა — დაამატეთ რედაქტირებიდან",
          );
          router.push("/admin/products");
          return;
        }
      }

      if (!isEditing && draftFitments.length > 0) {
        try {
          for (const fitment of draftFitments) {
            await createProductFitment(saved.id, fitment.vehicleCatalogId);
          }
        } catch {
          toast.error(
            "პროდუქტი შენახულია, მაგრამ თავსებადობის დამატება ვერ მოხერხდა — დაამატეთ რედაქტირებიდან",
          );
          router.push("/admin/products");
          return;
        }
      }

      toast.success(isEditing ? "პროდუქტი განახლდა" : "პროდუქტი დაემატა");
      router.push("/admin/products");
    } catch (error) {
      const message =
        error instanceof ApiRequestError ? error.message : "შენახვა ვერ მოხერხდა";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  const mainTabContent = (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium">კატეგორია *</label>
          <Select
            options={categoryOptions}
            value={categoryId}
            onChange={handleCategoryChange}
            searchable
            placeholder="აირჩიეთ კატეგორია"
          />
          <FieldError message={errors.categoryId} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium">ბრენდი</label>
          <Select
            options={productBrandOptions}
            value={productBrandId}
            onChange={setProductBrandId}
            searchable
            disabled={!categoryId}
            placeholder={categoryId ? "— არცერთი —" : "ჯერ აირჩიეთ კატეგორია"}
          />
        </div>
      </div>

      <LocalizedNameFields
        idPrefix="product-name"
        value={{ ka: nameKa, en: nameEn, ru: nameRu }}
        onChange={handleNameChange}
        onEnglishChange={(value) => {
          if (!slugTouched) setSlug(slugify(value));
        }}
        errors={{ ka: errors["name.ka"], en: errors["name.en"], ru: errors["name.ru"] }}
      />
    </>
  );

  const attributesTabContent = (
    <ProductAttributeFields
      categoryId={categoryId}
      values={attributeValues}
      onChange={handleAttributeChange}
      errors={errors}
      onAttributesLoaded={setCategoryAttributes}
    />
  );

  const descriptionTabContent = (
    <>
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium">აღწერა (ქართულად)</label>
        <RichTextEditor value={descriptionKa} onChange={handleDescriptionKaChange} />
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium">აღწერა (ინგლისურად)</label>
        <RichTextEditor value={descriptionEn} onChange={setDescriptionEn} />
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium">აღწერა (რუსულად)</label>
        <RichTextEditor value={descriptionRu} onChange={setDescriptionRu} />
      </div>
    </>
  );

  const imageTabContent = (
    <div className="flex flex-col gap-1.5">
      <label htmlFor="product-image" className="text-sm font-medium">
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
        id="product-image"
        type="file"
        accept="image/*"
        onChange={handleImageChange}
        className="text-sm text-muted-foreground file:mr-3 file:rounded-full file:border-0 file:bg-muted file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-foreground hover:file:bg-border"
      />
    </div>
  );

  const seoTabContent = (
    <>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="product-slug" className="text-sm font-medium">
          Slug *
        </label>
        <input
          id="product-slug"
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
        <label htmlFor="product-meta-title" className="text-sm font-medium">
          Meta სათაური
        </label>
        <input
          id="product-meta-title"
          value={metaTitle}
          onChange={(event) => {
            setMetaTitleTouched(true);
            setMetaTitle(event.target.value);
          }}
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
          onChange={(event) => {
            setMetaDescriptionTouched(true);
            setMetaDescription(event.target.value);
          }}
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

  const pricingTabContent = (
    <>
      <p className="text-xs text-muted-foreground">
        არასავალდებულოა — აირჩიეთ ზომები/ფერები და დააჭირეთ გენერაციას, პროდუქტთან ერთად
        დაემატება ყველა კომბინაცია ერთდროულად (სურათებითა და ფასდაკლებით — მხოლოდ პირველ
        გენერირებულ ვარიანტზე). ცარიელი დატოვების შემთხვევაში პროდუქტი შეინახება მხოლოდ
        სპეციფიკაციად — ვარიანტებს მოგვიანებით, რედაქტირებიდან დაამატებთ.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-muted-foreground">ზომები</label>
          <Select
            multiple
            options={lookupOptions(sizes)}
            value={initialSizeIds}
            onChange={setInitialSizeIds}
            searchable
            placeholder="— არცერთი —"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-muted-foreground">ფერები</label>
          <Select
            multiple
            options={lookupOptions(colors)}
            value={initialColorIds}
            onChange={setInitialColorIds}
            searchable
            placeholder="— არცერთი —"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-muted-foreground">მდგომარეობა</label>
          <Select options={lookupOptions(conditions)} value={initialConditionId} onChange={setInitialConditionId} searchable placeholder="— არცერთი —" />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-muted-foreground">სტატუსი</label>
          <Select options={lookupOptions(statuses)} value={initialStatusId} onChange={setInitialStatusId} searchable placeholder="— არცერთი —" />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-muted-foreground">SKU</label>
          <input
            type="text"
            value={initialBaseSku}
            onChange={(event) => setInitialBaseSku(event.target.value)}
            placeholder="საერთო ყველასთვის, ან ცარიელი"
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm font-mono outline-none focus:border-primary"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-muted-foreground">ფასი</label>
          <input
            type="number"
            step="0.01"
            value={initialBasePrice}
            onChange={(event) => setInitialBasePrice(event.target.value)}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          />
          <FieldError message={errors.price} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-muted-foreground">მარაგში (ცალი)</label>
          <input
            type="number"
            min={1}
            value={initialBaseStockQuantity}
            onChange={(event) => setInitialBaseStockQuantity(event.target.value)}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          />
          <FieldError message={errors.stockQuantity} />
        </div>
        <label className="flex items-center gap-2 self-end pb-2 text-sm font-medium">
          <Toggle checked={initialIsActive} onChange={setInitialIsActive} />
          აქტიურია
        </label>
      </div>

      <button
        type="button"
        onClick={handleGenerateDraftVariants}
        className="w-fit rounded-full border border-border px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:border-primary hover:text-primary"
      >
        + ვარიანტების გენერაცია
      </button>

      <DraftVariantsTable
        variants={draftVariants}
        sizes={sizes}
        colors={colors}
        onChange={updateDraftVariant}
        onRemove={removeDraftVariant}
      />

      {draftVariants.length > 0 && (
        <>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">სურათები</label>
            <p className="text-xs text-muted-foreground">დაერთვება პირველ გენერირებულ ვარიანტს.</p>
            <ProductVariantImagesPanel
              variantId={null}
              onPendingFilesChange={(files) => {
                pendingVariantImageFilesRef.current = files;
              }}
            />
          </div>

          <div className="flex flex-col gap-3 rounded-lg border border-border p-3">
            <h3 className="text-sm font-semibold">ფასდაკლება (არასავალდებულო, პირველ ვარიანტზე)</h3>
            <div className="grid gap-3 sm:grid-cols-4">
              <div className="flex flex-col gap-1.5">
                <input
                  type="number"
                  min={0}
                  max={100}
                  step="0.01"
                  placeholder="ფასდაკლება (%)"
                  value={initialDiscountPercent}
                  onChange={(event) => handleInitialDiscountPercentChange(event.target.value)}
                  className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                />
                <FieldError message={errors.discountPercent} />
              </div>
              <div className="flex flex-col gap-1.5">
                <input
                  type="number"
                  step="0.01"
                  placeholder="ფასდაკლების ფასი"
                  value={initialDiscountPrice}
                  onChange={(event) => setInitialDiscountPrice(event.target.value)}
                  className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                />
                <FieldError message={errors.discountPrice} />
              </div>
              <div className="flex flex-col gap-1.5">
                <input
                  type="date"
                  value={initialDiscountStartDate}
                  onChange={(event) => setInitialDiscountStartDate(event.target.value)}
                  className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                />
                <FieldError message={errors.startDate} />
              </div>
              <div className="flex flex-col gap-1.5">
                <input
                  type="date"
                  value={initialDiscountEndDate}
                  onChange={(event) => setInitialDiscountEndDate(event.target.value)}
                  className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                />
                <FieldError message={errors.endDate} />
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );

  const tabs = [
    { key: "main", label: "ძირითადი", content: mainTabContent },
    { key: "attributes", label: "მახასიათებლები", content: attributesTabContent },
    { key: "description", label: "აღწერა", content: descriptionTabContent },
    { key: "image", label: "სურათი", content: imageTabContent },
    { key: "seo", label: "SEO", content: seoTabContent },
    ...(isEditing
      ? [
          {
            key: "variants",
            label: "ვარიანტები",
            content: (
              <ProductVariantsPanel
                productId={product.id}
                sizes={sizes}
                colors={colors}
                conditions={conditions}
                statuses={statuses}
              />
            ),
          },
        ]
      : [{ key: "pricing", label: "ფასი", content: pricingTabContent }]),
    {
      key: "fitment",
      label: "თავსებადობა",
      content: isEditing ? (
        <ProductFitmentPanel
          productId={product.id}
          vehicleCatalog={vehicleCatalog}
          categories={categories}
          vehicleSpecLookups={vehicleSpecLookups}
        />
      ) : (
        <DraftFitmentEditor
          vehicleCatalog={vehicleCatalog}
          fitments={draftFitments}
          onAdd={addDraftFitment}
          onRemove={removeDraftFitment}
        />
      ),
    },
    ...(isEditing
      ? [
          {
            key: "buy-together",
            label: "ერთად შეძენა",
            content: <ProductBuyTogetherPanel productId={product.id} allProducts={allProducts} />,
          },
        ]
      : []),
  ];

  return (
    <div className="flex flex-col gap-4">
      <div>
        <button
          type="button"
          onClick={() => router.push("/admin/products")}
          className="text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          ← პროდუქტებზე დაბრუნება
        </button>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">
          {isEditing ? "პროდუქტის რედაქტირება" : "პროდუქტის დამატება"}
        </h1>
      </div>

      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-6"
      >
        <Tabs tabs={tabs} />
        <FormActions onCancel={() => router.push("/admin/products")} loading={loading} />
      </form>
    </div>
  );
}
