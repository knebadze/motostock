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
import type { DraftFitment } from "./DraftFitmentEditor";

export type ProductFormSaveInput = {
  isEditing: boolean;
  existingProductId: number | null;
  productInput: ProductInput;
  imageFile: File | null;
  // The rest only ever apply on create — once a product exists, variants
  // and fitments are managed through their own panels instead (see
  // ProductForm.tsx's isEditing-gated tabs). Each draft's own imageFiles/
  // discount* fields (see ProductPricingTab.tsx's DraftVariant type) travel
  // with it — no separate "first variant only" fields anymore.
  draftVariants: DraftVariant[];
  draftFitments: DraftFitment[];
};

export type ProductFormSaveResult =
  | { ok: true; product: Product }
  // A soft failure: the product itself is already saved, but one of the
  // follow-up steps failed — the caller still navigates away (nothing left
  // to retry in this form), just with a warning toast pointing at where to
  // finish up instead of the generic success one. Only the step that failed
  // is reported; later steps (fitments, after variants) are skipped, matching
  // the pre-refactor early-return behavior exactly.
  | { ok: false; product: Product; warning: "image" | "fitments" }
  // Variants are independent of each other (unlike image/fitments, which are
  // single all-or-nothing steps) — one draft's finaId/sku uniqueness conflict
  // shouldn't silently doom every other draft to being skipped, and the admin
  // needs to know exactly WHICH one(s) failed to fix them from the edit
  // screen, not just that "something" did.
  | { ok: false; product: Product; warning: "variants"; failedVariantLabels: string[] };

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
    const failedVariantLabels: string[] = [];

    for (const [index, draft] of input.draftVariants.entries()) {
      // Each draft is attempted independently — a unique-constraint conflict
      // (e.g. a duplicate finaId/sku) on one draft has no bearing on the
      // others, so it's recorded and the loop moves on instead of abandoning
      // every remaining draft.
      const label = draft.sku.trim() || `ვარიანტი #${index + 1}`;
      try {
        const variant = await createProductVariant({
          productId: product.id,
          sizeId: draft.sizeId,
          colorId: draft.colorId,
          conditionId: draft.conditionId,
          statusId: draft.statusId,
          finaId: draft.finaId.trim() ? Number(draft.finaId) : undefined,
          price: Number(draft.price),
          stockQuantity: draft.stockQuantity ? Number(draft.stockQuantity) : undefined,
          sku: draft.sku.trim() ? draft.sku.trim() : null,
          isActive: draft.isActive,
        });

        if (draft.imageFiles.length > 0) {
          await uploadProductVariantImages(variant.id, draft.imageFiles);
        }

        if (draft.discountPrice.trim() !== "") {
          await createProductVariantDiscount(variant.id, {
            discountPrice: Number(draft.discountPrice),
            discountPercent: draft.discountPercent ? Number(draft.discountPercent) : null,
            startDate: draft.discountStartDate,
            endDate: draft.discountEndDate,
          });
        }
      } catch {
        failedVariantLabels.push(label);
      }
    }

    if (failedVariantLabels.length > 0) {
      return { ok: false, product, warning: "variants", failedVariantLabels };
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

export const PRODUCT_FORM_SAVE_WARNING_MESSAGES: Record<"image" | "fitments", string> = {
  image: "პროდუქტი შენახულია, მაგრამ სურათის ატვირთვა ვერ მოხერხდა",
  fitments: "პროდუქტი შენახულია, მაგრამ თავსებადობის დამატება ვერ მოხერხდა — დაამატეთ რედაქტირებიდან",
};

// Names the specific draft(s) that failed, instead of one generic "something
// about the variants failed" toast — see saveProductForm's per-draft loop.
export function formatVariantSaveWarning(failedVariantLabels: string[]): string {
  return `პროდუქტი შენახულია, მაგრამ ეს ვარიანტ(ებ)ი ვერ დაემატა: ${failedVariantLabels.join(", ")} — დაამატეთ რედაქტირებიდან`;
}
