"use client";

import { useEffect, useState } from "react";

// Shared by every admin form with a single logo/image upload field
// (Bank/Brand/ProductBrand/TeamMember/HeroSlide/CompanyInfo/Category/
// VehicleCatalog forms) — tracks the selected File plus an object-URL
// preview, and revokes that URL on unmount/replacement so it doesn't leak.
// Extracted after the same "revokeObjectURL in a cleanup effect keyed on
// previewUrl" logic was independently copy-pasted into 8 call sites with
// inconsistent results — 3 of them (Bank/TeamMember/HeroSlide) never had
// the cleanup effect at all, leaking a blob URL per file picked before the
// form was saved/closed.
//
// `file` is only set once an actual new file is chosen; `previewUrl` starts
// at whatever the entity's already-saved image resolves to (pass
// `resolveMediaUrl(entity?.xUrl ?? null)`, or null for a new entity) and
// switches to a fresh blob: URL once one is picked. The `file &&` guard on
// revoke matters: without it, the initial resolveMediaUrl(...) URL (a real
// server URL, not a blob:) would be passed to revokeObjectURL, which is a
// silent no-op for non-blob URLs but wrong in intent.
export function useFileUploadPreview(initialUrl: string | null) {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(initialUrl);

  useEffect(() => {
    return () => {
      if (file && previewUrl) URL.revokeObjectURL(previewUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewUrl]);

  function onChange(event: React.ChangeEvent<HTMLInputElement>) {
    const next = event.target.files?.[0] ?? null;
    setFile(next);
    if (next) setPreviewUrl(URL.createObjectURL(next));
  }

  // For long-lived (non-modal) forms like CompanyInfoManager, which stays
  // mounted after a successful save instead of closing — clears the pending
  // file and swaps the preview to the newly-persisted server URL, so a
  // second save without picking a new file doesn't re-upload the stale one.
  function reset(nextUrl: string | null) {
    setFile(null);
    setPreviewUrl(nextUrl);
  }

  return { file, previewUrl, onChange, reset };
}
