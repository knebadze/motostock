"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { Toggle } from "@/components/shared/Toggle";
import {
  deleteHeroSlide,
  listHeroSlides,
  reorderHeroSlides,
  updateHeroSlide,
  type HeroSlide,
} from "@/lib/api/hero-slides";
import type { Category } from "@/lib/api/categories";
import type { ProductBrand } from "@/lib/api/product-brands";
import { ApiRequestError, resolveMediaUrl } from "@/lib/api/client";
import { HeroSlideFormModal } from "./HeroSlideFormModal";

const TYPE_LABELS: Record<HeroSlide["type"], string> = {
  CTA: "ღილაკი (CTA)",
  DISCOUNT: "ფასდაკლება",
  VEHICLE_SEARCH: "ტრანსპორტის ძებნა",
  CATEGORY_FILTER: "კატეგორიის არჩევა",
  INFO: "საინფორმაციო",
};

export function HeroSlidesManager({
  initialSlides,
  categories,
  productBrands,
}: {
  initialSlides: HeroSlide[];
  categories: Category[];
  productBrands: ProductBrand[];
}) {
  const [slides, setSlides] = useState(initialSlides);
  const [formOpen, setFormOpen] = useState(false);
  const [editingSlide, setEditingSlide] = useState<HeroSlide | null>(null);
  const [deletingSlide, setDeletingSlide] = useState<HeroSlide | null>(null);
  const [draggedId, setDraggedId] = useState<number | null>(null);

  async function refresh() {
    try {
      setSlides(await listHeroSlides());
    } catch (error) {
      const message =
        error instanceof ApiRequestError ? error.message : "სიის განახლება ვერ მოხერხდა";
      toast.error(message);
    }
  }

  function openCreateModal() {
    setEditingSlide(null);
    setFormOpen(true);
  }

  function openEditModal(slide: HeroSlide) {
    setEditingSlide(slide);
    setFormOpen(true);
  }

  async function handleToggleActive(slide: HeroSlide, isActive: boolean) {
    const previous = slides;
    setSlides((current) => current.map((s) => (s.id === slide.id ? { ...s, isActive } : s)));
    try {
      await updateHeroSlide(slide.id, { isActive });
    } catch (error) {
      setSlides(previous);
      const message = error instanceof ApiRequestError ? error.message : "განახლება ვერ მოხერხდა";
      toast.error(message);
    }
  }

  async function handleDrop(targetId: number) {
    const currentDraggedId = draggedId;
    setDraggedId(null);
    if (currentDraggedId === null || currentDraggedId === targetId) return;

    const order = slides.map((slide) => slide.id);
    const fromIndex = order.indexOf(currentDraggedId);
    const toIndex = order.indexOf(targetId);
    const nextOrder = [...order];
    nextOrder.splice(fromIndex, 1);
    nextOrder.splice(toIndex, 0, currentDraggedId);

    const previous = slides;
    setSlides(nextOrder.map((id) => slides.find((slide) => slide.id === id)!));

    try {
      setSlides(await reorderHeroSlides(nextOrder));
    } catch (error) {
      setSlides(previous);
      const message =
        error instanceof ApiRequestError ? error.message : "დალაგების შენახვა ვერ მოხერხდა";
      toast.error(message);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold tracking-tight">მთავარი სლაიდერი</h2>
        <button
          type="button"
          onClick={openCreateModal}
          className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover"
        >
          + სლაიდის დამატება
        </button>
      </div>

      <p className="mt-2 text-sm text-muted-foreground">
        გადაათრიეთ სლაიდები ერთმანეთში მთავარ გვერდზე გამოსაჩენი თანმიმდევრობის დასალაგებლად.
      </p>

      <div className="mt-6 flex flex-col gap-3">
        {slides.length === 0 && (
          <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            სლაიდი არ არის დამატებული
          </p>
        )}

        {slides.map((slide) => {
          const previewUrl = resolveMediaUrl(slide.imageUrl);
          return (
            <div
              key={slide.id}
              draggable
              onDragStart={() => setDraggedId(slide.id)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => handleDrop(slide.id)}
              className="flex cursor-grab items-center gap-4 rounded-xl border border-border bg-card p-3 shadow-sm active:cursor-grabbing"
            >
              <div className="relative size-16 shrink-0 overflow-hidden rounded-lg bg-muted">
                {previewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={previewUrl} alt="" className="size-full object-cover" />
                ) : (
                  <div className="size-full border border-dashed border-border" />
                )}
              </div>

              <div className="flex-1">
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                  {TYPE_LABELS[slide.type]}
                </span>
                <p className="mt-1 font-semibold text-foreground">{slide.title.ka}</p>
              </div>

              <Toggle checked={slide.isActive} onChange={(checked) => handleToggleActive(slide, checked)} />

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => openEditModal(slide)}
                  className="rounded-full px-3 py-1.5 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
                >
                  რედაქტირება
                </button>
                <button
                  type="button"
                  onClick={() => setDeletingSlide(slide)}
                  className="rounded-full px-3 py-1.5 text-sm font-semibold text-red-600 transition-colors hover:bg-red-500/10"
                >
                  წაშლა
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <HeroSlideFormModal
        key={`${editingSlide?.id ?? "new"}-${formOpen}`}
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={() => refresh()}
        slide={editingSlide}
        categories={categories}
        productBrands={productBrands}
      />

      <ConfirmDialog
        open={deletingSlide !== null}
        onClose={() => setDeletingSlide(null)}
        title="სლაიდის წაშლა"
        message={
          <>
            დარწმუნებული ხართ, რომ გსურთ წაშალოთ{" "}
            <span className="font-semibold text-foreground">{deletingSlide?.title.ka}</span>? ამ
            მოქმედების გაუქმება შეუძლებელია.
          </>
        }
        successMessage="სლაიდი წაიშალა"
        onConfirm={async () => {
          if (!deletingSlide) return;
          await deleteHeroSlide(deletingSlide.id);
          await refresh();
        }}
      />
    </div>
  );
}
