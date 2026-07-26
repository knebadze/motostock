"use client";

export function FormActions({
  onCancel,
  loading,
  submitLabel = "შენახვა",
  loadingLabel = "ინახება...",
}: {
  onCancel: () => void;
  loading: boolean;
  submitLabel?: string;
  loadingLabel?: string;
}) {
  return (
    <div className="mt-2 flex justify-end gap-3">
      <button
        type="button"
        onClick={onCancel}
        className="rounded-full border border-border px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:border-primary hover:text-primary"
      >
        გაუქმება
      </button>
      <button
        type="submit"
        disabled={loading}
        className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover disabled:opacity-50"
      >
        {loading ? loadingLabel : submitLabel}
      </button>
    </div>
  );
}
