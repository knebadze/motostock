"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FormActions } from "@/components/shared/FormActions";
import { Tabs } from "@/components/shared/Tabs";
import type { Product } from "@/lib/api/products";
import { siteConfig } from "@/config/site";
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
import {
  ProductFitmentPanel,
  DraftFitmentEditor,
  type DraftFitment,
  type VehicleSpecLookupMap,
} from "./ProductFitmentPanel";
import { ProductBuyTogetherPanel } from "./ProductBuyTogetherPanel";
import { ProductBasicInfoTab } from "./ProductBasicInfoTab";
import { ProductDescriptionTab } from "./ProductDescriptionTab";
import { ProductImageTab } from "./ProductImageTab";
import { ProductSeoTab } from "./ProductSeoTab";
import { ProductPricingTab, type DraftVariant } from "./ProductPricingTab";
import {
  toAttributeFieldValues,
  withAttributeDefaults,
  toAttributeValueInputs,
} from "./product-form-attributes";
import { saveProductForm, PRODUCT_FORM_SAVE_WARNING_MESSAGES } from "./product-form-save";

function toNullableHtml(html: string): string | null {
  const isBlank = html.replace(/<[^>]*>/g, "").trim() === "";
  return isBlank ? null : html;
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

  function handleEnglishNameChange(value: string) {
    if (!slugTouched) setSlug(slugify(value));
  }

  function handleDescriptionKaChange(html: string) {
    setDescriptionKa(html);
    if (!metaDescriptionTouched) {
      const plainText = html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
      setMetaDescription(plainText.slice(0, 160));
    }
  }

  function handleSlugChange(value: string) {
    setSlugTouched(true);
    setSlug(value);
  }

  function handleMetaTitleChange(value: string) {
    setMetaTitleTouched(true);
    setMetaTitle(value);
  }

  function handleMetaDescriptionChange(value: string) {
    setMetaDescriptionTouched(true);
    setMetaDescription(value);
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
    label: productBrand.name,
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
      const productInput = {
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

      const result = await saveProductForm({
        isEditing,
        existingProductId: product?.id ?? null,
        productInput,
        imageFile,
        draftVariants,
        pendingVariantImageFiles: pendingVariantImageFilesRef.current,
        initialDiscount: wantsInitialDiscount
          ? {
              price: initialDiscountPrice,
              percent: initialDiscountPercent,
              startDate: initialDiscountStartDate,
              endDate: initialDiscountEndDate,
            }
          : null,
        draftFitments,
      });

      if (result.ok) {
        toast.success(isEditing ? "პროდუქტი განახლდა" : "პროდუქტი დაემატა");
      } else {
        toast.error(PRODUCT_FORM_SAVE_WARNING_MESSAGES[result.warning]);
      }
      router.push("/admin/products");
    } catch (error) {
      const message =
        error instanceof ApiRequestError ? error.message : "შენახვა ვერ მოხერხდა";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  const tabs = [
    {
      key: "main",
      label: "ძირითადი",
      content: (
        <ProductBasicInfoTab
          categoryOptions={categoryOptions}
          categoryId={categoryId}
          onCategoryChange={handleCategoryChange}
          categoryError={errors.categoryId}
          categoryLocked={isEditing}
          productBrandOptions={productBrandOptions}
          productBrandId={productBrandId}
          onProductBrandChange={setProductBrandId}
          name={{ ka: nameKa, en: nameEn, ru: nameRu }}
          onNameChange={handleNameChange}
          onEnglishChange={handleEnglishNameChange}
          nameErrors={{ ka: errors["name.ka"], en: errors["name.en"], ru: errors["name.ru"] }}
        />
      ),
    },
    {
      key: "attributes",
      label: "მახასიათებლები",
      content: (
        <ProductAttributeFields
          categoryId={categoryId}
          values={attributeValues}
          onChange={handleAttributeChange}
          errors={errors}
          onAttributesLoaded={setCategoryAttributes}
        />
      ),
    },
    {
      key: "description",
      label: "აღწერა",
      content: (
        <ProductDescriptionTab
          descriptionKa={descriptionKa}
          onDescriptionKaChange={handleDescriptionKaChange}
          descriptionEn={descriptionEn}
          onDescriptionEnChange={setDescriptionEn}
          descriptionRu={descriptionRu}
          onDescriptionRuChange={setDescriptionRu}
        />
      ),
    },
    {
      key: "image",
      label: "სურათი",
      content: <ProductImageTab previewUrl={previewUrl} onImageChange={handleImageChange} />,
    },
    {
      key: "seo",
      label: "SEO",
      content: (
        <ProductSeoTab
          slug={slug}
          onSlugChange={handleSlugChange}
          metaTitle={metaTitle}
          onMetaTitleChange={handleMetaTitleChange}
          metaDescription={metaDescription}
          onMetaDescriptionChange={handleMetaDescriptionChange}
          errors={{ slug: errors.slug, metaTitle: errors.metaTitle, metaDescription: errors.metaDescription }}
        />
      ),
    },
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
      : [
          {
            key: "pricing",
            label: "ფასი",
            content: (
              <ProductPricingTab
                sizes={sizes}
                colors={colors}
                conditions={conditions}
                statuses={statuses}
                initialSizeIds={initialSizeIds}
                onInitialSizeIdsChange={setInitialSizeIds}
                initialColorIds={initialColorIds}
                onInitialColorIdsChange={setInitialColorIds}
                initialConditionId={initialConditionId}
                onInitialConditionIdChange={setInitialConditionId}
                initialStatusId={initialStatusId}
                onInitialStatusIdChange={setInitialStatusId}
                initialBaseSku={initialBaseSku}
                onInitialBaseSkuChange={setInitialBaseSku}
                initialBasePrice={initialBasePrice}
                onInitialBasePriceChange={setInitialBasePrice}
                initialBaseStockQuantity={initialBaseStockQuantity}
                onInitialBaseStockQuantityChange={setInitialBaseStockQuantity}
                initialIsActive={initialIsActive}
                onInitialIsActiveChange={setInitialIsActive}
                onGenerateDraftVariants={handleGenerateDraftVariants}
                draftVariants={draftVariants}
                onDraftVariantChange={updateDraftVariant}
                onDraftVariantRemove={removeDraftVariant}
                onPendingVariantImageFilesChange={(files) => {
                  pendingVariantImageFilesRef.current = files;
                }}
                initialDiscountPercent={initialDiscountPercent}
                onInitialDiscountPercentChange={handleInitialDiscountPercentChange}
                initialDiscountPrice={initialDiscountPrice}
                onInitialDiscountPriceChange={setInitialDiscountPrice}
                initialDiscountStartDate={initialDiscountStartDate}
                onInitialDiscountStartDateChange={setInitialDiscountStartDate}
                initialDiscountEndDate={initialDiscountEndDate}
                onInitialDiscountEndDateChange={setInitialDiscountEndDate}
                errors={errors}
              />
            ),
          },
        ]),
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
