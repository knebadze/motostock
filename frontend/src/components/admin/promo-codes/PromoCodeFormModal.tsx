"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Modal } from "@/components/shared/Modal";
import { Select } from "@/components/shared/Select";
import { FieldError } from "@/components/shared/FieldError";
import { FormActions } from "@/components/shared/FormActions";
import { Toggle } from "@/components/shared/Toggle";
import {
  createPromoCode,
  updatePromoCode,
  type PromoCode,
  type PromoCodeDomain,
} from "@/lib/api/promo-codes";
import type { Category } from "@/lib/api/categories";
import { listProductBrands, type ProductBrand } from "@/lib/api/product-brands";
import { listAttributes, type Attribute } from "@/lib/api/attributes";
import { listAttributeOptions, type AttributeOption } from "@/lib/api/attribute-options";
import { listBrands, type Brand } from "@/lib/api/brands";
import { listModels, type Model } from "@/lib/api/models";
import { listLookupItems, type LookupItem } from "@/lib/api/lookups";
import type { VehicleSpecField } from "@/lib/api/vehicle-category-filters";
import { ApiRequestError } from "@/lib/api/client";
import { flattenTree, isVehicleCategory } from "@/lib/categories-tree";
import { VEHICLE_SPEC_FIELDS } from "@/config/vehicle-spec-fields";
import { productPromoCodeFormSchema, vehiclePromoCodeFormSchema } from "@/lib/validation/promo-codes";
import { getFieldErrors, type FieldErrors } from "@/lib/validation/common";

const SPEC_FIELD_OPTIONS = VEHICLE_SPEC_FIELDS.filter((item) => item.kind === "LOOKUP");

export function PromoCodeFormModal({
  open,
  onClose,
  onSaved,
  domain,
  promoCode,
  categories,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  domain: PromoCodeDomain;
  promoCode: PromoCode | null;
  categories: Category[];
}) {
  const isEditing = promoCode !== null;

  const categoryOptions = useMemo(() => {
    const applicable =
      domain === "VEHICLE"
        ? categories.filter((category) => isVehicleCategory(categories, category.id))
        : categories;
    return flattenTree(applicable).map((category) => ({
      value: String(category.id),
      label: `${"— ".repeat(category.depth)}${category.name.ka}`,
    }));
  }, [categories, domain]);

  const [code, setCode] = useState(promoCode?.code ?? "");
  const [categoryId, setCategoryId] = useState(promoCode?.category ? String(promoCode.category.id) : "");
  // PRODUCT domain fields.
  const [productBrandId, setProductBrandId] = useState(
    promoCode?.productBrand ? String(promoCode.productBrand.id) : "",
  );
  const [attributeId, setAttributeId] = useState(promoCode?.attribute ? String(promoCode.attribute.id) : "");
  const [attributeOptionId, setAttributeOptionId] = useState(
    promoCode?.attributeOption ? String(promoCode.attributeOption.id) : "",
  );
  // VEHICLE domain fields.
  const [brandId, setBrandId] = useState(promoCode?.brand ? String(promoCode.brand.id) : "");
  const [modelId, setModelId] = useState(promoCode?.model ? String(promoCode.model.id) : "");
  const [specField, setSpecField] = useState(promoCode?.specField ?? "");
  const [specLookupItemId, setSpecLookupItemId] = useState(
    promoCode?.specValue ? String(promoCode.specValue.id) : "",
  );

  const [discountPercent, setDiscountPercent] = useState(promoCode ? String(promoCode.discountPercent) : "");
  const [usageLimit, setUsageLimit] = useState(
    promoCode?.usageLimit != null ? String(promoCode.usageLimit) : "",
  );
  const [startDate, setStartDate] = useState(promoCode?.startDate.slice(0, 10) ?? "");
  const [endDate, setEndDate] = useState(promoCode?.endDate.slice(0, 10) ?? "");
  const [isActive, setIsActive] = useState(promoCode?.isActive ?? true);

  const [categoryBrands, setCategoryBrands] = useState<ProductBrand[]>([]);
  const [categorySelectAttributes, setCategorySelectAttributes] = useState<Attribute[]>([]);
  const [attributeOptions, setAttributeOptions] = useState<AttributeOption[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [models, setModels] = useState<Model[]>([]);
  const [specValueOptions, setSpecValueOptions] = useState<LookupItem[]>([]);

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});

  // PRODUCT: brands/attributes are category-scoped.
  useEffect(() => {
    if (domain !== "PRODUCT" || !categoryId) return;

    let cancelled = false;
    Promise.all([listProductBrands(Number(categoryId)), listAttributes(Number(categoryId))]).then(
      ([brandItems, attributeItems]) => {
        if (cancelled) return;
        setCategoryBrands(brandItems);
        setCategorySelectAttributes(attributeItems.filter((item) => item.valueType === "SELECT"));
      },
    );

    return () => {
      cancelled = true;
    };
  }, [domain, categoryId]);

  useEffect(() => {
    if (domain !== "PRODUCT" || !attributeId) return;

    let cancelled = false;
    listAttributeOptions(Number(attributeId)).then((items) => {
      if (!cancelled) setAttributeOptions(items);
    });

    return () => {
      cancelled = true;
    };
  }, [domain, attributeId]);

  // VEHICLE: brands are a flat global list; models are brand-scoped.
  useEffect(() => {
    if (domain !== "VEHICLE") return;
    listBrands().then(setBrands);
  }, [domain]);

  useEffect(() => {
    if (domain !== "VEHICLE" || !brandId) return;

    let cancelled = false;
    listModels(Number(brandId)).then((items) => {
      if (!cancelled) setModels(items);
    });

    return () => {
      cancelled = true;
    };
  }, [domain, brandId]);

  useEffect(() => {
    if (domain !== "VEHICLE" || !specField) return;

    const lookupType = SPEC_FIELD_OPTIONS.find((item) => item.field === specField)?.lookupType;
    if (!lookupType) return;

    let cancelled = false;
    listLookupItems(lookupType).then((items) => {
      if (!cancelled) setSpecValueOptions(items);
    });

    return () => {
      cancelled = true;
    };
  }, [domain, specField]);

  function handleCategoryChange(nextCategoryId: string) {
    setCategoryId(nextCategoryId);
    setProductBrandId("");
    setAttributeId("");
    setAttributeOptionId("");
  }

  function handleAttributeChange(nextAttributeId: string) {
    setAttributeId(nextAttributeId);
    setAttributeOptionId("");
  }

  function handleBrandChange(nextBrandId: string) {
    setBrandId(nextBrandId);
    setModelId("");
  }

  function handleSpecFieldChange(nextSpecField: string) {
    setSpecField(nextSpecField);
    setSpecLookupItemId("");
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    const result =
      domain === "PRODUCT"
        ? productPromoCodeFormSchema.safeParse({
            code,
            categoryId,
            productBrandId,
            attributeId,
            attributeOptionId,
            discountPercent,
            usageLimit,
            startDate,
            endDate,
          })
        : vehiclePromoCodeFormSchema.safeParse({
            code,
            categoryId,
            brandId,
            modelId,
            specField,
            specLookupItemId,
            discountPercent,
            usageLimit,
            startDate,
            endDate,
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
        domain,
        code: code.trim().toUpperCase(),
        categoryId: categoryId ? Number(categoryId) : null,
        productBrandId: domain === "PRODUCT" && productBrandId ? Number(productBrandId) : null,
        attributeId: domain === "PRODUCT" && attributeId ? Number(attributeId) : null,
        attributeOptionId: domain === "PRODUCT" && attributeOptionId ? Number(attributeOptionId) : null,
        brandId: domain === "VEHICLE" && brandId ? Number(brandId) : null,
        modelId: domain === "VEHICLE" && modelId ? Number(modelId) : null,
        specField: domain === "VEHICLE" && specField ? (specField as VehicleSpecField) : null,
        specLookupItemId: domain === "VEHICLE" && specLookupItemId ? Number(specLookupItemId) : null,
        discountPercent: Number(discountPercent),
        usageLimit: usageLimit.trim() ? Number(usageLimit) : null,
        startDate,
        endDate,
        isActive,
      };

      if (isEditing) {
        await updatePromoCode(promoCode.id, input);
      } else {
        await createPromoCode(input);
      }

      toast.success(isEditing ? "პრომოკოდი განახლდა" : "პრომოკოდი დაემატა");
      onSaved();
      onClose();
    } catch (error) {
      const message = error instanceof ApiRequestError ? error.message : "შენახვა ვერ მოხერხდა";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  const productBrandOptions = categoryBrands.map((brand) => ({ value: String(brand.id), label: brand.name.ka }));
  const attributeSelectOptions = categorySelectAttributes.map((attribute) => ({
    value: String(attribute.id),
    label: attribute.name.ka,
  }));
  const attributeValueOptions = attributeOptions.map((option) => ({
    value: String(option.id),
    label: option.label.ka,
  }));
  const brandOptions = brands.map((brand) => ({ value: String(brand.id), label: brand.name }));
  const modelOptions = models.map((model) => ({ value: String(model.id), label: model.name }));
  const specFieldOptions = SPEC_FIELD_OPTIONS.map((item) => ({ value: item.field, label: item.label }));
  const specValueSelectOptions = specValueOptions.map((item) => ({ value: String(item.id), label: item.nameKa }));

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEditing ? "პრომოკოდის რედაქტირება" : "პრომოკოდის დამატება"}
      size="xl"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <p className="text-xs text-muted-foreground">
          კატეგორია არასავალდებულოა — ცარიელი დატოვების შემთხვევაში კოდი ვრცელდება
          {domain === "PRODUCT" ? " ყველა პროდუქტზე" : " მთელ ტრანსპორტზე"}. მითითებისას კი შეიძლება
          დამატებით დაზუსტდეს {domain === "PRODUCT" ? "ბრენდით და/ან მახასიათებლით" : "მარკით, მოდელით და/ან მახასიათებლით"}.
        </p>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium">კოდი *</label>
          <input
            type="text"
            value={code}
            onChange={(event) => setCode(event.target.value)}
            placeholder="მაგ. SUMMER15"
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm font-mono uppercase outline-none focus:border-primary"
          />
          <FieldError message={errors.code} />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium">კატეგორია</label>
          <Select
            options={categoryOptions}
            value={categoryId}
            onChange={handleCategoryChange}
            searchable
            placeholder={domain === "PRODUCT" ? "— ყველა პროდუქტი —" : "— მთელი ტრანსპორტი —"}
          />
          <FieldError message={errors.categoryId} />
        </div>

        {domain === "PRODUCT" ? (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">ბრენდი</label>
                <Select
                  options={productBrandOptions}
                  value={productBrandId}
                  onChange={setProductBrandId}
                  searchable
                  disabled={!categoryId}
                  placeholder={categoryId ? "— ყველა ბრენდი —" : "ჯერ აირჩიეთ კატეგორია"}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">მახასიათებელი</label>
                <Select
                  options={attributeSelectOptions}
                  value={attributeId}
                  onChange={handleAttributeChange}
                  searchable
                  disabled={!categoryId}
                  placeholder={categoryId ? "— არცერთი —" : "ჯერ აირჩიეთ კატეგორია"}
                />
              </div>
            </div>

            {attributeId && (
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">მახასიათებლის მნიშვნელობა *</label>
                <Select
                  options={attributeValueOptions}
                  value={attributeOptionId}
                  onChange={setAttributeOptionId}
                  searchable
                  placeholder="აირჩიეთ მნიშვნელობა"
                />
                <FieldError message={errors.attributeOptionId} />
              </div>
            )}
          </>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">მარკა</label>
                <Select
                  options={brandOptions}
                  value={brandId}
                  onChange={handleBrandChange}
                  searchable
                  placeholder="— ყველა მარკა —"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">მოდელი</label>
                <Select
                  options={modelOptions}
                  value={modelId}
                  onChange={setModelId}
                  searchable
                  disabled={!brandId}
                  placeholder={brandId ? "— ყველა მოდელი —" : "ჯერ აირჩიეთ მარკა"}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">მახასიათებელი</label>
                <Select
                  options={specFieldOptions}
                  value={specField}
                  onChange={handleSpecFieldChange}
                  placeholder="— არცერთი —"
                />
              </div>
              {specField && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium">მნიშვნელობა *</label>
                  <Select
                    options={specValueSelectOptions}
                    value={specLookupItemId}
                    onChange={setSpecLookupItemId}
                    searchable
                    placeholder="აირჩიეთ მნიშვნელობა"
                  />
                  <FieldError message={errors.specLookupItemId} />
                </div>
              )}
            </div>
          </>
        )}

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">ფასდაკლება (%) *</label>
            <input
              type="number"
              min={0}
              max={100}
              step="0.01"
              value={discountPercent}
              onChange={(event) => setDiscountPercent(event.target.value)}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            />
            <FieldError message={errors.discountPercent} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">დაწყება *</label>
            <input
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            />
            <FieldError message={errors.startDate} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">დასრულება *</label>
            <input
              type="date"
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            />
            <FieldError message={errors.endDate} />
          </div>
        </div>

        <div className="flex flex-col gap-1.5 sm:w-1/3">
          <label className="text-sm font-medium">გამოყენების ლიმიტი</label>
          <input
            type="number"
            min={1}
            step="1"
            value={usageLimit}
            onChange={(event) => setUsageLimit(event.target.value)}
            placeholder="ულიმიტო"
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          />
          <p className="text-xs text-muted-foreground">
            სულ რამდენმა მომხმარებელმა შეიძლება გამოიყენოს ეს კოდი. ცარიელი — ულიმიტო.
            {isEditing && ` აქამდე გამოყენებულია: ${promoCode?.usageCount ?? 0}.`}
          </p>
          <FieldError message={errors.usageLimit} />
        </div>

        <label className="flex items-center gap-2 text-sm font-medium">
          <Toggle checked={isActive} onChange={setIsActive} />
          აქტიურია
        </label>

        <FormActions onCancel={onClose} loading={loading} />
      </form>
    </Modal>
  );
}
