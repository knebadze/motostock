"use client";

import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Modal } from "@/components/shared/Modal";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { Select } from "@/components/shared/Select";
import { Toggle } from "@/components/shared/Toggle";
import { LocalizedNameFields } from "@/components/shared/LocalizedNameFields";
import { FieldError } from "@/components/shared/FieldError";
import { FormActions } from "@/components/shared/FormActions";
import { useFileUploadPreview } from "@/components/shared/useFileUploadPreview";
import {
  createCategory,
  previewCategoryAttributeImpact,
  updateCategory,
  uploadCategoryBannerImage,
  uploadCategoryMenuImage,
  uploadCategoryImage,
  type Category,
  type CategoryAttributeImpact,
} from "@/lib/api/categories";
import { ApiRequestError, resolveMediaUrl } from "@/lib/api/client";
import { listLookupItems, type LookupItem } from "@/lib/api/lookups";
import { getDescendantIds, slugify } from "@/lib/categories-tree";
import { categoryFormSchema } from "@/lib/validation/categories";
import { getFieldErrors, type FieldErrors } from "@/lib/validation/common";
import { uploadFailedMessage } from "@/lib/upload-error";

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
  // On edit the stored slug is the live URL — renaming mustn't silently
  // regenerate it; only an explicit edit of the slug field changes it.
  const [slugTouched, setSlugTouched] = useState(isEditing);
  const [parentId, setParentId] = useState<string>(
    category?.parentId != null ? String(category.parentId) : "",
  );
  // For a NEW category, defaulting to 0 meant it silently jumped to the
  // very first position among its siblings unless the admin noticed and
  // typed a different number — this computes "last among siblings" instead,
  // scoped to whichever parent is currently selected (siblings sharing the
  // same parentId, or top-level when none is selected). Editing an existing
  // category keeps its own stored value unchanged.
  function nextSortOrderForParent(parentIdValue: string): number {
    const parentIdNumber = parentIdValue ? Number(parentIdValue) : null;
    const siblings = categories.filter((candidate) => candidate.parentId === parentIdNumber);
    return siblings.reduce((max, sibling) => Math.max(max, sibling.sortOrder), -1) + 1;
  }
  const [sortOrder, setSortOrder] = useState(
    category ? category.sortOrder : nextSortOrderForParent(parentId),
  );
  // Mirrors slugTouched below — once the admin manually edits sortOrder,
  // stop overwriting it when they then change the parent dropdown.
  const [sortOrderTouched, setSortOrderTouched] = useState(false);
  const [lowStockBadgeEnabled, setLowStockBadgeEnabled] = useState(
    category?.lowStockBadgeEnabled ?? true,
  );
  const [onlinePurchaseEnabled, setOnlinePurchaseEnabled] = useState(
    category?.onlinePurchaseEnabled ?? true,
  );
  const [vehicleFitmentEnabled, setVehicleFitmentEnabled] = useState(
    category?.vehicleFitmentEnabled ?? true,
  );
  const [inheritsAttributes, setInheritsAttributes] = useState(category?.inheritsAttributes ?? true);
  const [sizeScaleId, setSizeScaleId] = useState(category?.sizeScaleId != null ? String(category.sizeScaleId) : "");
  const [sizeScales, setSizeScales] = useState<LookupItem[]>([]);

  useEffect(() => {
    listLookupItems("size-scales")
      .then(setSizeScales)
      .catch(() => setSizeScales([]));
  }, []);
  const { file: imageFile, previewUrl, onChange: handleImageChange } = useFileUploadPreview(
    resolveMediaUrl(category?.imageUrl ?? null),
  );
  const {
    file: bannerImageFile,
    previewUrl: bannerPreviewUrl,
    onChange: handleBannerImageChange,
  } = useFileUploadPreview(resolveMediaUrl(category?.bannerImageUrl ?? null));
  const {
    file: menuImageFile,
    previewUrl: menuPreviewUrl,
    onChange: handleMenuImageChange,
  } = useFileUploadPreview(resolveMediaUrl(category?.menuImageUrl ?? null));
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  // Set while the admin is asked to confirm a parent / inheritance change
  // that deletes product attribute values (or imposes new required ones).
  const [pendingImpact, setPendingImpact] = useState<CategoryAttributeImpact | null>(null);

  const excludedIds = category ? getDescendantIds(categories, category.id) : new Set<number>();
  const parentOptions = categories
    .filter((item) => item.id !== category?.id && !excludedIds.has(item.id))
    .map((item) => ({ value: String(item.id), label: item.name.ka }));

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

    // Changing the parent or "inherit parent attributes" can make attributes
    // stop applying to this category's products — their values are then
    // deleted on save, so the admin confirms first.
    const nextParentId = parentId ? Number(parentId) : null;
    if (
      isEditing &&
      (nextParentId !== category.parentId || inheritsAttributes !== category.inheritsAttributes)
    ) {
      setLoading(true);
      try {
        const impact = await previewCategoryAttributeImpact(category.id, {
          parentId: nextParentId,
          inheritsAttributes,
        });
        if (impact.removedValueCount > 0 || impact.newlyRequired.length > 0) {
          setPendingImpact(impact);
          return;
        }
      } catch (error) {
        toast.error(error instanceof ApiRequestError ? error.message : "ცვლილების შემოწმება ვერ მოხერხდა");
        return;
      } finally {
        setLoading(false);
      }
    }

    await save();
  }

  async function save() {
    setLoading(true);

    try {
      const input = {
        name: { ka: nameKa.trim(), en: nameEn.trim(), ru: nameRu.trim() },
        slug: slug.trim(),
        parentId: parentId ? Number(parentId) : null,
        sortOrder,
        lowStockBadgeEnabled,
        onlinePurchaseEnabled,
        vehicleFitmentEnabled,
        inheritsAttributes,
        sizeScaleId: sizeScaleId ? Number(sizeScaleId) : null,
      };

      const savedCategory = isEditing
        ? await updateCategory(category.id, input)
        : await createCategory(input);

      if (imageFile) {
        try {
          await uploadCategoryImage(savedCategory.id, imageFile);
        } catch (error) {
          toast.error(uploadFailedMessage("კატეგორია შენახულია, მაგრამ სურათის ატვირთვა ვერ მოხერხდა", error));
          onSaved();
          onClose();
          return;
        }
      }

      if (bannerImageFile) {
        try {
          await uploadCategoryBannerImage(savedCategory.id, bannerImageFile);
        } catch (error) {
          toast.error(uploadFailedMessage("კატეგორია შენახულია, მაგრამ hero ბანერის ატვირთვა ვერ მოხერხდა", error));
          onSaved();
          onClose();
          return;
        }
      }

      // Only top-level categories open a header mega menu (see the field
      // below), so a file picked before switching to a parent is ignored.
      if (menuImageFile && !parentId) {
        try {
          await uploadCategoryMenuImage(savedCategory.id, menuImageFile);
        } catch (error) {
          toast.error(uploadFailedMessage("კატეგორია შენახულია, მაგრამ მენიუს სურათის ატვირთვა ვერ მოხერხდა", error));
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
          <label htmlFor="category-parent" className="text-sm font-medium">
            მშობელი კატეგორია
          </label>
          <Select
            id="category-parent"
            options={parentOptions}
            value={parentId}
            onChange={(value) => {
              setParentId(value);
              if (!isEditing && !sortOrderTouched) setSortOrder(nextSortOrderForParent(value));
            }}
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
            onChange={(event) => {
              setSortOrder(Number(event.target.value));
              setSortOrderTouched(true);
            }}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          />
          <p className="text-xs text-muted-foreground">
            პატარა რიცხვი უფრო ადრე გამოჩნდება ჰეადერის მენიუში
          </p>
        </div>

        <div className="rounded-xl border border-border p-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium">„დარჩა მხოლოდ N ცალი&rdquo; ბეჯი</p>
              <p className="mt-1 text-xs text-muted-foreground">
                ჩართვის შემთხვევაში ამ კატეგორიის პროდუქტებზე გამოჩნდება მარაგის სიმცირის
                გამაფრთხილებელი ბეჯი, თუ ნაშთი დაბალია. გამორთეთ კატეგორიებზე, სადაც ერთეულობითი
                მარაგი ჩვეულებრივი მოვლენაა და ბეჯი აზრს დაკარგავს.
              </p>
            </div>
            <Toggle
              checked={lowStockBadgeEnabled}
              onChange={setLowStockBadgeEnabled}
              label="„დარჩა მხოლოდ N ცალი” ბეჯი"
            />
          </div>
        </div>

        <div className="rounded-xl border border-border p-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium">საიტიდან შეძენა (კალათა)</p>
              <p className="mt-1 text-xs text-muted-foreground">
                გამორთვის შემთხვევაში ამ კატეგორიის ნივთებს კალათაში დამატების ღილაკის ნაცვლად
                გამოუჩნდება „შესაძენად ეწვიეთ შოურუმს&rdquo;. ვრცელდება ყველა ქვეკატეგორიაზეც.
              </p>
            </div>
            <Toggle
              checked={onlinePurchaseEnabled}
              onChange={setOnlinePurchaseEnabled}
              label="საიტიდან შეძენა"
            />
          </div>
        </div>

        <div className="rounded-xl border border-border p-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium">ტრანსპორტთან თავსებადობა</p>
              <p className="mt-1 text-xs text-muted-foreground">
                ჩართეთ კატეგორიებზე, რომელთა პროდუქტები კონკრეტულ ტრანსპორტზეა დამოკიდებული
                (ნაწილები, ზეთები): პროდუქტის ფორმაში გამოჩნდება „თავსებადობის&rdquo; ჩანართი, საიტზე
                კი თავსებადობის სია, „ჩემი ტრანსპორტის&rdquo; ფილტრი და შემოწმება checkout-ზე.
                გამორთეთ, მაგალითად, ჩაფხუტებზე. ვრცელდება ყველა ქვეკატეგორიაზეც.
              </p>
            </div>
            <Toggle
              checked={vehicleFitmentEnabled}
              onChange={setVehicleFitmentEnabled}
              label="ტრანსპორტთან თავსებადობა"
            />
          </div>
        </div>

        <div className="rounded-xl border border-border p-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium">მშობლის მახასიათებლების მემკვიდრეობა</p>
              <p className="mt-1 text-xs text-muted-foreground">
                ჩართულისას ამ კატეგორიას მშობელი კატეგორიების მახასიათებლებიც ეხება. გამორთეთ, როცა
                ისინი აქ არ შეესაბამება (მაგ. ჩაფხუტის აქსესუარებს ჩაფხუტის სერტიფიკატი): მაშინ
                მოქმედებს მხოლოდ ამ კატეგორიაზე და მის ქვეკატეგორიებზე დამატებული მახასიათებლები.
                ბრენდები და ფასის ფილტრი კვლავ მემკვიდრეობით გადადის. გამორთვისას (ან კატეგორიის სხვა
                მშობელზე გადატანისას) პროდუქტებს წაეშლებათ იმ მახასიათებლების მნიშვნელობები, რომლებიც
                აღარ ეკუთვნის — შენახვამდე ნახავთ, რა წაიშლება.
              </p>
            </div>
            <Toggle
              checked={inheritsAttributes}
              onChange={setInheritsAttributes}
              label="მშობლის მახასიათებლების მემკვიდრეობა"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="category-size-scale" className="text-sm font-medium">
            ვარიანტის ზომის სკალა
          </label>
          <Select
            id="category-size-scale"
            options={[
              { value: "", label: "— მშობლისგან —" },
              ...sizeScales.map((scale) => ({ value: String(scale.id), label: scale.nameKa })),
            ]}
            value={sizeScaleId}
            onChange={setSizeScaleId}
          />
          <p className="text-xs text-muted-foreground">
            რას ზომავს პროდუქტის ვარიანტის „ზომა&rdquo; ამ კატეგორიაში (ტანსაცმლის ზომა, ფეხსაცმლის EU
            ზომა, მოცულობა, ბიჯი…). ვარიანტის ფორმა მხოლოდ ამ სკალის ზომებს შემოგთავაზებთ, საიტზე კი
            სკალის სახელი გამოჩნდება. ცარიელი = მშობელი კატეგორიისგან; ქვეკატეგორიებზეც ვრცელდება.
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
          <p className="text-xs text-muted-foreground">რეკომენდებული ზომა 400×400px (კვადრატული)</p>
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

        {!parentId && (
          <div className="flex flex-col gap-1.5">
            <label htmlFor="category-menu-image" className="text-sm font-medium">
              ჰედერის მენიუს სურათი
            </label>
            {menuPreviewUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={menuPreviewUrl}
                alt=""
                className="size-32 rounded-lg border border-border object-cover"
              />
            )}
            <input
              id="category-menu-image"
              type="file"
              accept="image/*"
              onChange={handleMenuImageChange}
              className="text-sm text-muted-foreground file:mr-3 file:rounded-full file:border-0 file:bg-muted file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-foreground hover:file:bg-border"
            />
            <p className="text-xs text-muted-foreground">
              ჩანს ჰედერის ჩამოსაშლელ მენიუში, ქვეკატეგორიების მარჯვნივ (მხოლოდ მთავარ კატეგორიებზე).
              რეკომენდებული ზომა 512×512px (კვადრატული). თუ არ ატვირთავთ, გამოჩნდება კატეგორიის
              ზემოთა სურათი
            </p>
          </div>
        )}

        <FormActions onCancel={onClose} loading={loading} />
      </form>

      <ConfirmDialog
        open={pendingImpact !== null}
        onClose={() => setPendingImpact(null)}
        title="მახასიათებლების ცვლილება"
        confirmLabel="შენახვა"
        message={
          pendingImpact && (
            <div className="flex flex-col gap-3 text-left">
              {pendingImpact.removedValueCount > 0 && (
                <p>
                  ამ ცვლილების შემდეგ მახასიათებლები{" "}
                  <span className="font-semibold text-foreground">
                    {pendingImpact.removedAttributes.map((attribute) => attribute.name).join(", ")}
                  </span>{" "}
                  ამ კატეგორიას აღარ ეკუთვნის — წაიშლება მათი{" "}
                  <span className="font-semibold text-foreground">{pendingImpact.removedValueCount}</span> მნიშვნელობა{" "}
                  <span className="font-semibold text-foreground">{pendingImpact.affectedProductCount}</span> პროდუქტიდან.
                  ამის გაუქმება შეუძლებელია.
                </p>
              )}
              {pendingImpact.newlyRequired.length > 0 && (
                <p>
                  ახალი სავალდებულო მახასიათებელი:{" "}
                  {pendingImpact.newlyRequired.map((attribute, index) => (
                    <span key={attribute.id}>
                      {index > 0 && ", "}
                      <span className="font-semibold text-foreground">{attribute.name}</span> — აკლია{" "}
                      {attribute.missingProductCount} პროდუქტს
                    </span>
                  ))}
                  . ამ პროდუქტების რედაქტირებისას მისი შევსება გახდება საჭირო.
                </p>
              )}
            </div>
          )
        }
        onConfirm={async () => {
          setPendingImpact(null);
          await save();
        }}
      />
    </Modal>
  );
}
