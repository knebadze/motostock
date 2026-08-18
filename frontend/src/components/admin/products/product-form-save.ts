import {
  createProduct,
  updateProduct,
  uploadProductImage,
  type Product,
  type ProductInput,
} from "@/lib/api/products";
import { createProductVariant } from "@/lib/api/product-variants";
import { uploadProductVariantImages } from "@/lib/api/product-variant-images";
import { createProductVariantDiscount } from "@/lib/api/product-variant-discounts";
import { createProductFitment } from "@/lib/api/product-fitment";
import type { DraftVariant } from "./ProductPricingTab";
import type { DraftFitment } from "./ProductFitmentPanel";

export type ProductFormSaveInput = {
  isEditing: boolean;
  existingProductId: number | null;
  productInput: ProductInput;
  imageFile: File | null;
  // The rest only ever apply on create — once a product exists, variants
  // and fitments are managed through their own panels instead (see
  // ProductForm.tsx's isEditing-gated tabs).
  draftVariants: DraftVariant[];
  pendingVariantImageFiles: File[];
  initialDiscount: {
    price: string;
    percent: string;
    startDate: string;
    endDate: string;
  } | null;
  draftFitments: DraftFitment[];
};

export type ProductFormSaveResult =
  | { ok: true; product: Product }
  // A soft failure: the product itself is already saved, but one of the
  // follow-up steps failed — the caller still navigates away (nothing left
  // to retry in this form), just with a warning toast pointing at where to
  // finish up instead of the generic success one. Only the step that failed
  // is reported; later steps are skipped, matching the pre-refactor
  // early-return behavior exactly.
  | { ok: false; product: Product; warning: "image" | "variants" | "fitments" };

// Runs the multi-step "save a product" pipeline: create/update the product
// row, then (create-flow only) the variant matrix + its image/discount, then
// the fitment links. Each follow-up step is independently best-effort — if
// one fails, the pipeline stops there (matching the original inline
// behavior) and the caller is told which step to point the admin at.
export async function saveProductForm(input: ProductFormSaveInput): Promise<ProductFormSaveResult> {
  const product =
    input.isEditing && input.existingProductId != null
      ? await updateProduct(input.existingProductId, input.productInput)
      : await createProduct(input.productInput);

  if (input.imageFile) {
    try {
      await uploadProductImage(product.id, input.imageFile);
    } catch {
      return { ok: false, product, warning: "image" };
    }
  }

  if (!input.isEditing && input.draftVariants.length > 0) {
    try {
      let firstVariantId: number | null = null;
      for (const draft of input.draftVariants) {
        const variant = await createProductVariant({
          productId: product.id,
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

      if (firstVariantId !== null && input.pendingVariantImageFiles.length > 0) {
        await uploadProductVariantImages(firstVariantId, input.pendingVariantImageFiles);
      }

      if (firstVariantId !== null && input.initialDiscount) {
        await createProductVariantDiscount(firstVariantId, {
          discountPrice: Number(input.initialDiscount.price),
          discountPercent: input.initialDiscount.percent ? Number(input.initialDiscount.percent) : null,
          startDate: input.initialDiscount.startDate,
          endDate: input.initialDiscount.endDate,
        });
      }
    } catch {
      return { ok: false, product, warning: "variants" };
    }
  }

  if (!input.isEditing && input.draftFitments.length > 0) {
    try {
      for (const fitment of input.draftFitments) {
        await createProductFitment(product.id, fitment.vehicleCatalogId);
      }
    } catch {
      return { ok: false, product, warning: "fitments" };
    }
  }

  return { ok: true, product };
}

export const PRODUCT_FORM_SAVE_WARNING_MESSAGES: Record<"image" | "variants" | "fitments", string> = {
  image: "პროდუქტი შენახულია, მაგრამ სურათის ატვირთვა ვერ მოხერხდა",
  variants: "პროდუქტი შენახულია, მაგრამ ვარიანტების დამატება ვერ მოხერხდა — დაამატეთ რედაქტირებიდან",
  fitments: "პროდუქტი შენახულია, მაგრამ თავსებადობის დამატება ვერ მოხერხდა — დაამატეთ რედაქტირებიდან",
};
