"use client";

export function ProductImageTab({
  previewUrl,
  onImageChange,
}: {
  previewUrl: string | null;
  onImageChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
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
        onChange={onImageChange}
        className="text-sm text-muted-foreground file:mr-3 file:rounded-full file:border-0 file:bg-muted file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-foreground hover:file:bg-border"
      />
    </div>
  );
}
