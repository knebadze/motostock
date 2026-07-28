"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  deleteProductVariantImage,
  listProductVariantImages,
  reorderProductVariantImages,
  uploadProductVariantImages,
  type ProductVariantImage,
} from "@/lib/api/product-variant-images";
import { ApiRequestError, resolveMediaUrl } from "@/lib/api/client";

type LocalImage = { id: number; file: File; previewUrl: string };
type DisplayItem = { key: string; previewUrl: string };

export function ProductVariantImagesPanel({
  variantId,
  onPendingFilesChange,
}: {
  // null while creating a new variant (no id to upload against yet) — images
  // are then held locally and uploaded right after the variant is created.
  variantId: number | null;
  onPendingFilesChange?: (files: File[]) => void;
}) {
  const isAttached = variantId !== null;

  const [remoteImages, setRemoteImages] = useState<ProductVariantImage[]>([]);
  const [localImages, setLocalImages] = useState<LocalImage[]>([]);
  const [loaded, setLoaded] = useState(!isAttached);
  const [uploading, setUploading] = useState(false);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [draggedKey, setDraggedKey] = useState<string | null>(null);
  const nextLocalIdRef = useRef(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isAttached) return;
    let cancelled = false;

    listProductVariantImages(variantId)
      .then((items) => {
        if (!cancelled) setRemoteImages(items);
      })
      .catch(() => {
        toast.error("სურათების ჩატვირთვა ვერ მოხერხდა");
      })
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });

    return () => {
      cancelled = true;
    };
  }, [isAttached, variantId]);

  useEffect(() => {
    return () => {
      localImages.forEach((image) => URL.revokeObjectURL(image.previewUrl));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const items: DisplayItem[] = isAttached
    ? remoteImages.map((image) => ({ key: String(image.id), previewUrl: image.imageUrl }))
    : localImages.map((image) => ({ key: String(image.id), previewUrl: image.previewUrl }));

  async function handleFilesSelected(files: File[]) {
    if (isAttached) {
      setUploading(true);
      try {
        const uploaded = await uploadProductVariantImages(variantId, files);
        setRemoteImages(uploaded);
      } catch (error) {
        const message =
          error instanceof ApiRequestError ? error.message : "ატვირთვა ვერ მოხერხდა";
        toast.error(message);
      } finally {
        setUploading(false);
      }
      return;
    }

    setLocalImages((current) => {
      const wrapped = files.map((file) => ({
        id: nextLocalIdRef.current++,
        file,
        previewUrl: URL.createObjectURL(file),
      }));
      const next = [...current, ...wrapped];
      onPendingFilesChange?.(next.map((image) => image.file));
      return next;
    });
  }

  function handleFileInputChange(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    if (files.length > 0) handleFilesSelected(files);
    event.target.value = "";
  }

  function handleContainerDragOver(event: React.DragEvent) {
    event.preventDefault();
    if (event.dataTransfer.types.includes("Files")) {
      setIsDraggingFile(true);
    }
  }

  function handleContainerDrop(event: React.DragEvent) {
    event.preventDefault();
    setIsDraggingFile(false);
    const files = Array.from(event.dataTransfer.files ?? []).filter((file) =>
      file.type.startsWith("image/"),
    );
    if (files.length > 0) handleFilesSelected(files);
  }

  async function handleDelete(key: string) {
    if (isAttached) {
      try {
        await deleteProductVariantImage(variantId, Number(key));
        setRemoteImages((current) => current.filter((image) => String(image.id) !== key));
        toast.success("სურათი წაიშალა");
      } catch (error) {
        const message = error instanceof ApiRequestError ? error.message : "წაშლა ვერ მოხერხდა";
        toast.error(message);
      }
      return;
    }

    setLocalImages((current) => {
      const target = current.find((image) => String(image.id) === key);
      if (target) URL.revokeObjectURL(target.previewUrl);
      const next = current.filter((image) => String(image.id) !== key);
      onPendingFilesChange?.(next.map((image) => image.file));
      return next;
    });
  }

  async function handleThumbDrop(event: React.DragEvent, targetKey: string) {
    event.preventDefault();
    event.stopPropagation();
    setIsDraggingFile(false);

    const currentKey = draggedKey;
    setDraggedKey(null);
    if (currentKey === null || currentKey === targetKey) return;

    if (isAttached) {
      const order = remoteImages.map((image) => String(image.id));
      const fromIndex = order.indexOf(currentKey);
      const toIndex = order.indexOf(targetKey);
      const nextOrder = [...order];
      nextOrder.splice(fromIndex, 1);
      nextOrder.splice(toIndex, 0, currentKey);

      const previous = remoteImages;
      setRemoteImages(
        nextOrder.map((id) => remoteImages.find((image) => String(image.id) === id)!),
      );

      try {
        const updated = await reorderProductVariantImages(variantId, nextOrder.map(Number));
        setRemoteImages(updated);
      } catch (error) {
        setRemoteImages(previous);
        const message =
          error instanceof ApiRequestError ? error.message : "დალაგების შენახვა ვერ მოხერხდა";
        toast.error(message);
      }
      return;
    }

    setLocalImages((current) => {
      const order = current.map((image) => String(image.id));
      const fromIndex = order.indexOf(currentKey);
      const toIndex = order.indexOf(targetKey);
      const nextOrder = [...order];
      nextOrder.splice(fromIndex, 1);
      nextOrder.splice(toIndex, 0, currentKey);
      const next = nextOrder.map((id) => current.find((image) => String(image.id) === id)!);
      onPendingFilesChange?.(next.map((image) => image.file));
      return next;
    });
  }

  if (!loaded) return null;

  return (
    <div className="flex flex-col gap-3">
      <div
        onDragOver={handleContainerDragOver}
        onDragLeave={() => setIsDraggingFile(false)}
        onDrop={handleContainerDrop}
        className={`flex flex-wrap gap-3 rounded-lg border-2 border-dashed p-4 transition-colors ${
          isDraggingFile ? "border-primary bg-primary/5" : "border-border"
        }`}
      >
        {items.map((item, index) => (
          <div
            key={item.key}
            draggable
            onDragStart={() => setDraggedKey(item.key)}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => handleThumbDrop(event, item.key)}
            className="group relative size-28 cursor-grab active:cursor-grabbing"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={resolveMediaUrl(item.previewUrl) ?? item.previewUrl}
              alt=""
              className="size-28 rounded-lg border border-border object-cover"
            />
            {index === 0 && (
              <span className="absolute left-1 top-1 rounded-full bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground">
                მთავარი
              </span>
            )}
            <button
              type="button"
              onClick={() => handleDelete(item.key)}
              aria-label="წაშლა"
              className="absolute -right-2 -top-2 flex size-6 items-center justify-center rounded-full bg-red-600 text-white opacity-0 shadow transition-opacity group-hover:opacity-100"
            >
              ×
            </button>
          </div>
        ))}

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="flex size-28 flex-col items-center justify-center gap-1 rounded-lg border border-border text-xs text-muted-foreground transition-colors hover:border-primary hover:text-primary disabled:opacity-50"
        >
          <span className="text-2xl leading-none">+</span>
          {uploading ? "იტვირთება..." : "სურათის დამატება"}
        </button>
      </div>

      <p className="text-xs text-muted-foreground">
        გადაათრიეთ სურათები აქ ატვირთვისთვის, ან გადაათრიეთ უკვე დამატებული სურათები
        ერთმანეთში დასალაგებლად — პირველი სურათი იქნება მთავარი ფოტო.
      </p>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileInputChange}
        className="hidden"
      />
    </div>
  );
}
